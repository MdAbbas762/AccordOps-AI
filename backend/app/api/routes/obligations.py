from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import AuthContext, get_current_user
from app.core.rate_limit import require_rate_limited_editor
from app.models.workflows import (
    ExtractionResponse,
    ObligationItem,
    ReviewRequest,
)
from app.services.ai import calculate_extraction_confidence, extract_obligations
from app.services.audit import write_audit
from app.services.supabase import get_supabase_admin


router = APIRouter()


def _contract_map(organization_id: str, contract_ids: list[str]) -> dict[str, str]:
    if not contract_ids:
        return {}
    response = (
        get_supabase_admin()
        .table("contracts")
        .select("id, title")
        .eq("organization_id", organization_id)
        .in_("id", contract_ids)
        .execute()
    )
    return {str(row["id"]): row["title"] for row in response.data or []}


@router.get("/obligations", response_model=list[ObligationItem])
def list_obligations(
    current_user: AuthContext = Depends(get_current_user),
) -> list[dict]:
    supabase = get_supabase_admin()
    response = (
        supabase.table("obligations")
        .select(
            "id, contract_id, obligation_type, title, description, "
            "responsible_party, owner_team, status, risk_level, ai_confidence, "
            "source_clause, source_page, source_text, rule_config, "
            "reviewed_at, created_at"
        )
        .eq("organization_id", current_user.organization_id)
        .order("created_at", desc=True)
        .execute()
    )
    rows = response.data or []
    contracts = _contract_map(
        current_user.organization_id,
        list({str(row["contract_id"]) for row in rows}),
    )
    items: list[dict] = []
    for row in rows:
        rule_config = row.get("rule_config") or {}
        provider = rule_config.get("ai_provider")
        confidence = float(row["ai_confidence"]) if row.get("ai_confidence") is not None else None
        confidence_factors = rule_config.get("confidence_factors", [])

        # V2.2 recalculates Gemini extraction quality from observable clause/rule
        # evidence. This also corrects already-extracted rows that inherited the
        # model's repeated self-reported confidence value.
        if provider == "gemini":
            confidence, confidence_factors = calculate_extraction_confidence(
                source_clause=row.get("source_clause"),
                description=row.get("description") or "",
                responsible_party=row.get("responsible_party"),
                source_page=row.get("source_page"),
                rule_config=rule_config,
            )

        items.append(
            {
                **row,
                "id": str(row["id"]),
                "contract_id": str(row["contract_id"]),
                "contract_title": contracts.get(str(row["contract_id"]), "Unknown contract"),
                "ai_confidence": confidence,
                "extraction_provider": provider,
                "extraction_model": rule_config.get("ai_model"),
                "confidence_factors": confidence_factors,
            }
        )
    return items


@router.post(
    "/contracts/{contract_id}/extract-obligations",
    response_model=ExtractionResponse,
)
def run_obligation_extraction(
    contract_id: str,
    current_user: AuthContext = Depends(require_rate_limited_editor),
) -> ExtractionResponse:
    supabase = get_supabase_admin()
    contract_response = (
        supabase.table("contracts")
        .select("id, title")
        .eq("id", contract_id)
        .eq("organization_id", current_user.organization_id)
        .limit(1)
        .execute()
    )
    if not contract_response.data:
        raise HTTPException(status_code=404, detail="Contract not found")
    contract = contract_response.data[0]

    version_response = (
        supabase.table("contract_versions")
        .select("id, extracted_text")
        .eq("contract_id", contract_id)
        .eq("organization_id", current_user.organization_id)
        .eq("is_current", True)
        .limit(1)
        .execute()
    )
    if not version_response.data:
        raise HTTPException(status_code=409, detail="Current contract version not found")
    version = version_response.data[0]
    text = (version.get("extracted_text") or "").strip()
    if not text:
        raise HTTPException(status_code=409, detail="Contract has no extracted text")

    existing_rows = (
        supabase.table("obligations")
        .select("id, status")
        .eq("contract_version_id", str(version["id"]))
        .eq("organization_id", current_user.organization_id)
        .execute()
    ).data or []
    if any(row.get("status") != "candidate" for row in existing_rows):
        raise HTTPException(
            status_code=409,
            detail=(
                "Obligations for this contract version have already been human-reviewed. "
                "Upload a new version before running extraction again."
            ),
        )

    try:
        bundle, provider, model = extract_obligations(text, contract["title"])
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI extraction failed: {exc}",
        ) from exc

    # Refresh only unreviewed candidates for this exact version. Human decisions stay intact.
    (
        supabase.table("obligations")
        .delete()
        .eq("contract_version_id", str(version["id"]))
        .eq("organization_id", current_user.organization_id)
        .eq("status", "candidate")
        .execute()
    )

    payload = []
    for item in bundle.obligations[:25]:
        payload.append(
            {
                "organization_id": current_user.organization_id,
                "contract_id": contract_id,
                "contract_version_id": str(version["id"]),
                "obligation_type": item.obligation_type,
                "title": item.title,
                "description": item.description,
                "responsible_party": item.responsible_party,
                "owner_team": item.owner_team,
                "status": "candidate",
                "risk_level": item.risk_level,
                "ai_confidence": item.confidence,
                "source_clause": item.source_clause,
                "source_page": item.source_page,
                "source_text": item.source_text,
                "rule_config": {
                    **item.rule_config,
                    "ai_provider": provider,
                    "ai_model": model,
                },
            }
        )

    if payload:
        supabase.table("obligations").insert(payload).execute()

    write_audit(
        organization_id=current_user.organization_id,
        actor_user_id=current_user.user_id,
        actor_type="ai" if provider == "gemini" else "system",
        entity_type="contract",
        entity_id=contract_id,
        action="obligations.extracted",
        details={
            "provider": provider,
            "model": model,
            "count": len(payload),
            "summary": bundle.summary,
        },
    )

    return ExtractionResponse(
        contract_id=contract_id,
        contract_version_id=str(version["id"]),
        provider=provider,
        model=model,
        created=len(payload),
        summary=bundle.summary,
    )


@router.post("/obligations/{obligation_id}/review")
def review_obligation(
    obligation_id: str,
    request: ReviewRequest,
    current_user: AuthContext = Depends(require_rate_limited_editor),
) -> dict:
    supabase = get_supabase_admin()
    response = (
        supabase.table("obligations")
        .select("id, contract_id, title, status")
        .eq("id", obligation_id)
        .eq("organization_id", current_user.organization_id)
        .limit(1)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Obligation not found")

    row = response.data[0]
    update = {
        "status": request.decision,
        "reviewed_by": current_user.user_id,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
    }
    if request.owner_team is not None:
        update["owner_team"] = request.owner_team.strip() or None

    supabase.table("obligations").update(update).eq("id", obligation_id).execute()

    if request.decision == "approved":
        supabase.table("contracts").update({"status": "active"}).eq(
            "id", str(row["contract_id"])
        ).eq("organization_id", current_user.organization_id).execute()

    write_audit(
        organization_id=current_user.organization_id,
        actor_user_id=current_user.user_id,
        actor_type="user",
        entity_type="obligation",
        entity_id=obligation_id,
        action=f"obligation.{request.decision}",
        details={"title": row["title"], "owner_team": request.owner_team},
    )
    return {"status": request.decision, "obligation_id": obligation_id}
