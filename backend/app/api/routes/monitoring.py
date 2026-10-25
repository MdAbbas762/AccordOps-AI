from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import AuthContext, get_current_user
from app.core.rate_limit import require_rate_limited_editor
from app.models.workflows import ExceptionItem, MonitoringSimulationRequest
from app.services.automation import dispatch_monitoring_event
from app.services.supabase import get_supabase_admin


router = APIRouter()


@router.get("/exceptions", response_model=list[ExceptionItem])
def list_exceptions(
    current_user: AuthContext = Depends(get_current_user),
) -> list[dict]:
    supabase = get_supabase_admin()
    response = (
        supabase.table("exceptions")
        .select(
            "id, contract_id, obligation_id, exception_type, severity, status, "
            "title, summary, expected_value, observed_value, detected_at"
        )
        .eq("organization_id", current_user.organization_id)
        .order("detected_at", desc=True)
        .execute()
    )
    rows = response.data or []
    obligation_ids = list({str(row["obligation_id"]) for row in rows})
    contract_ids = list({str(row["contract_id"]) for row in rows if row.get("contract_id")})

    obligation_map = {}
    if obligation_ids:
        data = (
            supabase.table("obligations")
            .select("id, title")
            .in_("id", obligation_ids)
            .execute()
        ).data or []
        obligation_map = {str(row["id"]): row["title"] for row in data}

    contract_map = {}
    if contract_ids:
        data = (
            supabase.table("contracts")
            .select("id, title")
            .in_("id", contract_ids)
            .execute()
        ).data or []
        contract_map = {str(row["id"]): row["title"] for row in data}

    exception_ids = [str(row["id"]) for row in rows]
    investigation_map = {}
    approval_map = {}
    if exception_ids:
        investigations = (
            supabase.table("investigations")
            .select("exception_id, status, finding, confidence, recommended_action, model_name")
            .in_("exception_id", exception_ids)
            .execute()
        ).data or []
        investigation_map = {str(row["exception_id"]): row for row in investigations}
        approvals = (
            supabase.table("approvals")
            .select("id, exception_id")
            .in_("exception_id", exception_ids)
            .execute()
        ).data or []
        approval_map = {str(row["exception_id"]): str(row["id"]) for row in approvals}

    return [
        {
            **row,
            "id": str(row["id"]),
            "contract_id": str(row["contract_id"]) if row.get("contract_id") else None,
            "obligation_id": str(row["obligation_id"]),
            "contract_title": contract_map.get(str(row.get("contract_id"))),
            "obligation_title": obligation_map.get(str(row["obligation_id"]), "Unknown obligation"),
            "investigation": investigation_map.get(str(row["id"])),
            "approval_id": approval_map.get(str(row["id"])),
        }
        for row in rows
    ]


@router.post("/exceptions/simulate")
def simulate_monitoring_exception(
    request: MonitoringSimulationRequest,
    current_user: AuthContext = Depends(require_rate_limited_editor),
) -> dict:
    """Backward-compatible UI endpoint that now dispatches through the automation layer."""
    try:
        return dispatch_monitoring_event(
            organization_id=current_user.organization_id,
            obligation_id=request.obligation_id,
            observed_value=request.observed_value,
            evidence_note=request.evidence_note,
            source="accordops_ui",
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Monitoring automation failed: {exc}") from exc
