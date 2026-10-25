from datetime import datetime, timezone
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import AuthContext, get_current_user
from app.core.rate_limit import require_rate_limited_editor
from app.core.config import settings
from app.models.workflows import ApprovalDecisionRequest, ApprovalItem
from app.services.audit import write_audit
from app.services.supabase import get_supabase_admin


router = APIRouter()


@router.get("/approvals", response_model=list[ApprovalItem])
def list_approvals(
    current_user: AuthContext = Depends(get_current_user),
) -> list[dict]:
    supabase = get_supabase_admin()
    approvals = (
        supabase.table("approvals")
        .select(
            "id, exception_id, investigation_id, requested_action, risk_level, "
            "status, decision_note, created_at, decided_at"
        )
        .eq("organization_id", current_user.organization_id)
        .order("created_at", desc=True)
        .execute()
    ).data or []

    exception_ids = list({str(row["exception_id"]) for row in approvals})
    investigation_ids = list(
        {str(row["investigation_id"]) for row in approvals if row.get("investigation_id")}
    )
    exception_map = {}
    investigation_map = {}
    if exception_ids:
        data = (
            supabase.table("exceptions").select("id, title").in_("id", exception_ids).execute()
        ).data or []
        exception_map = {str(row["id"]): row["title"] for row in data}
    if investigation_ids:
        data = (
            supabase.table("investigations")
            .select("id, finding, confidence")
            .in_("id", investigation_ids)
            .execute()
        ).data or []
        investigation_map = {str(row["id"]): row for row in data}

    output = []
    for row in approvals:
        investigation = investigation_map.get(str(row.get("investigation_id")), {})
        output.append(
            {
                **row,
                "id": str(row["id"]),
                "exception_id": str(row["exception_id"]),
                "exception_title": exception_map.get(str(row["exception_id"]), "Exception"),
                "investigation_finding": investigation.get("finding"),
                "investigation_confidence": (
                    float(investigation["confidence"])
                    if investigation.get("confidence") is not None
                    else None
                ),
            }
        )
    return output


def _dispatch_n8n_action(payload: dict) -> tuple[bool, str | None]:
    if settings.automation_mode != "n8n" or not settings.n8n_action_webhook_url:
        return False, None
    headers = {"Content-Type": "application/json"}
    if settings.n8n_webhook_secret:
        headers["X-AccordOps-Secret"] = settings.n8n_webhook_secret
    try:
        response = httpx.post(
            settings.n8n_action_webhook_url,
            json=payload,
            headers=headers,
            timeout=30,
        )
        response.raise_for_status()
        return True, None
    except Exception as exc:
        return False, str(exc)


@router.post("/approvals/{approval_id}/decision")
def decide_approval(
    approval_id: str,
    request: ApprovalDecisionRequest,
    current_user: AuthContext = Depends(require_rate_limited_editor),
) -> dict:
    supabase = get_supabase_admin()
    response = (
        supabase.table("approvals")
        .select("id, exception_id, requested_action, status")
        .eq("id", approval_id)
        .eq("organization_id", current_user.organization_id)
        .limit(1)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Approval not found")
    approval = response.data[0]
    if approval["status"] != "pending":
        raise HTTPException(status_code=409, detail="Approval has already been decided")

    now = datetime.now(timezone.utc).isoformat()
    supabase.table("approvals").update(
        {
            "status": request.decision,
            "decided_by": current_user.user_id,
            "decision_note": request.note,
            "decided_at": now,
        }
    ).eq("id", approval_id).execute()

    action_id = None
    action_status = None
    automation = settings.automation_mode
    if request.decision == "approved":
        action_id = str(uuid4())
        execution_payload = {
            "action_id": action_id,
            "organization_id": current_user.organization_id,
            "approval_id": approval_id,
            "exception_id": str(approval["exception_id"]),
            "action_type": "operational_task",
            "requested_action": approval["requested_action"],
            "approved_by": current_user.email,
        }
        supabase.table("actions").insert(
            {
                "id": action_id,
                "organization_id": current_user.organization_id,
                "exception_id": str(approval["exception_id"]),
                "approval_id": approval_id,
                "action_type": "operational_task",
                "target_system": "n8n" if automation == "n8n" else "local_python",
                "status": "queued" if automation == "n8n" else "succeeded",
                "idempotency_key": f"approval-{approval_id}",
                "request_payload": execution_payload,
                "response_payload": (
                    {}
                    if automation == "n8n"
                    else {
                        "workflow": "local controlled remediation",
                        "message": "Remediation work item recorded after human approval.",
                    }
                ),
                "executed_at": None if automation == "n8n" else now,
            }
        ).execute()

        if automation == "n8n":
            dispatched, dispatch_error = _dispatch_n8n_action(execution_payload)
            if dispatched:
                action_status = "queued"
            else:
                action_status = "failed"
                supabase.table("actions").update(
                    {"status": "failed", "error_message": dispatch_error, "executed_at": now}
                ).eq("id", action_id).execute()
        else:
            action_status = "succeeded"
            supabase.table("exceptions").update(
                {"status": "resolved", "resolved_at": now}
            ).eq("id", str(approval["exception_id"])).execute()

    elif request.decision == "rejected":
        supabase.table("exceptions").update({"status": "investigating"}).eq(
            "id", str(approval["exception_id"])
        ).execute()

    write_audit(
        organization_id=current_user.organization_id,
        actor_user_id=current_user.user_id,
        actor_type="user",
        entity_type="approval",
        entity_id=approval_id,
        action=f"approval.{request.decision}",
        details={
            "note": request.note,
            "action_id": action_id,
            "action_status": action_status,
            "automation": automation,
            "requested_action": approval["requested_action"],
        },
    )
    return {
        "approval_id": approval_id,
        "status": request.decision,
        "action_id": action_id,
        "action_status": action_status,
        "automation": automation,
    }
