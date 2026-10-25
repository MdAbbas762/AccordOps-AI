from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.core.auth import AuthContext, get_current_user
from app.core.rate_limit import require_rate_limited_editor
from app.core.config import settings
from app.models.workflows import (
    ActionCompletionRequest,
    AutomationContext,
    EvidenceDispatchRequest,
    EvaluationResultRequest,
    LocalEvaluationRequest,
)
from app.services.audit import write_audit
from app.services.automation import (
    dispatch_monitoring_event,
    evaluate_locally,
    get_obligation_context,
    n8n_health,
    record_evaluation,
)
from app.services.supabase import get_supabase_admin


router = APIRouter(prefix="/automation")


def _require_automation_secret(secret: str | None) -> None:
    if not settings.n8n_webhook_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="N8N_WEBHOOK_SECRET is not configured",
        )
    if not secret or secret != settings.n8n_webhook_secret:
        raise HTTPException(status_code=401, detail="Invalid automation secret")


@router.get("/status")
def automation_status(
    current_user: AuthContext = Depends(get_current_user),
) -> dict:
    supabase = get_supabase_admin()
    healthy, health_error = n8n_health()
    def count_rows(table: str, **filters: str) -> int:
        query = (
            supabase.table(table)
            .select("id", count="exact")
            .eq("organization_id", current_user.organization_id)
        )
        for column, value in filters.items():
            query = query.eq(column, value)
        response = query.limit(1).execute()
        return int(response.count or 0)

    approved_controls = count_rows("obligations", status="approved")
    candidate_controls = count_rows("obligations", status="candidate")
    pending_approvals = count_rows("approvals", status="pending")
    open_exceptions = sum(
        count_rows("exceptions", status=value)
        for value in ("open", "investigating", "pending_approval")
    )
    total_reviewable = approved_controls + candidate_controls
    coverage_percent = round((approved_controls / total_reviewable) * 100) if total_reviewable else 0

    last_action = (
        supabase.table("actions")
        .select("status, target_system, response_payload, executed_at, created_at")
        .eq("organization_id", current_user.organization_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    ).data or []
    last_event = (
        supabase.table("events")
        .select("source_system, event_type, occurred_at, payload")
        .eq("organization_id", current_user.organization_id)
        .order("occurred_at", desc=True)
        .limit(1)
        .execute()
    ).data or []

    return {
        "automation_mode": settings.automation_mode,
        "n8n": {
            "configured": bool(settings.n8n_evidence_webhook_url and settings.n8n_action_webhook_url and settings.n8n_webhook_secret),
            "reachable": healthy,
            "base_url": settings.n8n_base_url,
            "health_error": health_error,
            "workflows": [
                {
                    "name": "AccordOps — Operational Evidence Monitor",
                    "purpose": "Normalizes operational evidence, evaluates compliance, and creates exceptions when required.",
                    "configured": bool(settings.n8n_evidence_webhook_url),
                },
                {
                    "name": "AccordOps — Approved Remediation",
                    "purpose": "Executes only human-approved remediation and reports the result to AccordOps.",
                    "configured": bool(settings.n8n_action_webhook_url),
                },
            ],
            "last_action": last_action[0] if last_action else None,
            "last_event": last_event[0] if last_event else None,
        },
        "ai": {
            "mode": settings.resolved_ai_mode,
            "gemini_configured": bool(settings.gemini_api_key),
            "model": settings.gemini_model if settings.gemini_api_key else "python-control-extractor-v2",
        },
        "pulse": {
            "approved_controls": approved_controls,
            "candidate_controls": candidate_controls,
            "open_exceptions": open_exceptions,
            "pending_approvals": pending_approvals,
            "coverage_percent": coverage_percent,
            "headline": (
                f"{open_exceptions} exception{'s' if open_exceptions != 1 else ''} need attention"
                if open_exceptions
                else (
                    f"{pending_approvals} decision{'s' if pending_approvals != 1 else ''} waiting for review"
                    if pending_approvals
                    else "No active exceptions are blocking the control loop"
                )
            ),
            "focus": (
                f"Review {candidate_controls} extracted control{'s' if candidate_controls != 1 else ''} to increase monitoring coverage."
                if candidate_controls
                else "All reviewed controls are ready for monitoring."
            ),
            "next_action": (
                "Resolve the highest-risk exception before approving additional remediation."
                if open_exceptions
                else (
                    "Complete the pending approval queue before corrective work can run."
                    if pending_approvals
                    else (
                        "Review the remaining candidate controls, then send fresh operational evidence."
                        if candidate_controls
                        else "Send fresh operational evidence to keep the control posture current."
                    )
                )
            ),
        },
        "optional_channels": {
            "slack_configured": bool(settings.slack_webhook_url),
        },
    }


@router.post("/monitor")
def monitor_obligation(
    request: EvidenceDispatchRequest,
    current_user: AuthContext = Depends(require_rate_limited_editor),
) -> dict:
    try:
        return dispatch_monitoring_event(
            organization_id=current_user.organization_id,
            obligation_id=request.obligation_id,
            observed_value=request.observed_value,
            evidence_note=request.evidence_note,
            source=request.source,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Automation workflow failed: {exc}") from exc


@router.get("/obligations/{obligation_id}/context", response_model=AutomationContext)
def obligation_context_for_n8n(
    obligation_id: str,
    organization_id: str,
    x_accordops_secret: str | None = Header(default=None),
) -> dict:
    _require_automation_secret(x_accordops_secret)
    try:
        return get_obligation_context(
            organization_id=organization_id,
            obligation_id=obligation_id,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/evaluate-local")
def local_evaluation_for_n8n(
    request: LocalEvaluationRequest,
    x_accordops_secret: str | None = Header(default=None),
) -> dict:
    _require_automation_secret(x_accordops_secret)
    try:
        return evaluate_locally(
            organization_id=request.organization_id,
            obligation_id=request.obligation_id,
            observed_value=request.observed_value,
            evidence_note=request.evidence_note,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/evaluations/record")
def record_n8n_evaluation(
    request: EvaluationResultRequest,
    x_accordops_secret: str | None = Header(default=None),
) -> dict:
    _require_automation_secret(x_accordops_secret)
    return record_evaluation(request)


@router.get("/actions/{action_id}/context")
def action_context_for_n8n(
    action_id: str,
    organization_id: str,
    x_accordops_secret: str | None = Header(default=None),
) -> dict:
    _require_automation_secret(x_accordops_secret)
    rows = (
        get_supabase_admin()
        .table("actions")
        .select("id, organization_id, exception_id, approval_id, action_type, target_system, status, request_payload")
        .eq("id", action_id)
        .eq("organization_id", organization_id)
        .limit(1)
        .execute()
    ).data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Action not found")
    row = rows[0]
    if row["status"] not in {"queued", "running"}:
        raise HTTPException(status_code=409, detail="Action is not executable")
    return row


@router.post("/actions/{action_id}/complete")
def complete_n8n_action(
    action_id: str,
    request: ActionCompletionRequest,
    x_accordops_secret: str | None = Header(default=None),
) -> dict:
    _require_automation_secret(x_accordops_secret)
    supabase = get_supabase_admin()
    rows = (
        supabase.table("actions")
        .select("id, exception_id, approval_id, status")
        .eq("id", action_id)
        .eq("organization_id", request.organization_id)
        .limit(1)
        .execute()
    ).data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Action not found")
    row = rows[0]
    now = datetime.now(timezone.utc).isoformat()
    supabase.table("actions").update(
        {
            "status": request.status,
            "target_system": "n8n",
            "response_payload": {
                "workflow_name": request.workflow_name,
                "execution_summary": request.execution_summary,
                **request.response_payload,
            },
            "error_message": request.error_message,
            "executed_at": now,
        }
    ).eq("id", action_id).execute()

    if request.status == "succeeded" and row.get("exception_id"):
        supabase.table("exceptions").update(
            {"status": "resolved", "resolved_at": now}
        ).eq("id", str(row["exception_id"])).execute()

    write_audit(
        organization_id=request.organization_id,
        actor_user_id=None,
        actor_type="n8n",
        entity_type="action",
        entity_id=action_id,
        action=f"automation.action_{request.status}",
        details={
            "workflow": request.workflow_name,
            "summary": request.execution_summary,
            "approval_id": str(row.get("approval_id")) if row.get("approval_id") else None,
        },
    )
    return {"status": request.status, "action_id": action_id}
