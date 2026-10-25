from fastapi import APIRouter, Depends, Query

from app.core.auth import AuthContext, get_current_user
from app.models.workflows import AuditItem
from app.services.supabase import get_supabase_admin


router = APIRouter()


def _event_presentation(action: str, details: dict) -> tuple[str, str, str, str | None]:
    mapping = {
        "contract.uploaded": (
            "Contract uploaded",
            f"{details.get('title', 'A contract')} was securely ingested and prepared for analysis.",
            "contracts",
            "completed",
        ),
        "obligations.extracted": (
            "Contract controls extracted",
            f"{details.get('count', 0)} monitorable obligations were identified and queued for review.",
            "ai",
            "completed",
        ),
        "obligation.approved": (
            "Obligation approved",
            f"{details.get('title', 'An obligation')} became an active monitoring control.",
            "approvals",
            "approved",
        ),
        "obligation.rejected": (
            "Obligation rejected",
            f"{details.get('title', 'An obligation')} was rejected during human review.",
            "approvals",
            "rejected",
        ),
        "monitoring.check_passed": (
            "Monitoring check passed",
            details.get("finding") or "Operational evidence satisfied the approved contract control.",
            "monitoring",
            "compliant",
        ),
        "exception.investigated": (
            "Exception investigated",
            details.get("finding") or "A potential contractual variance was reviewed and routed for approval.",
            "ai",
            "needs_review",
        ),
        "approval.approved": (
            "Remediation approved",
            details.get("requested_action") or "A human reviewer approved the proposed remediation.",
            "approvals",
            "approved",
        ),
        "approval.rejected": (
            "Remediation rejected",
            details.get("requested_action") or "A human reviewer rejected the proposed remediation.",
            "approvals",
            "rejected",
        ),
        "automation.action_succeeded": (
            "Automation completed",
            details.get("summary") or "The approved remediation workflow completed successfully.",
            "automation",
            "succeeded",
        ),
        "automation.action_failed": (
            "Automation failed",
            details.get("summary") or "The approved remediation workflow did not complete successfully.",
            "automation",
            "failed",
        ),
    }
    if action in mapping:
        return mapping[action]
    readable = action.replace(".", " ").replace("_", " ").strip().title()
    return readable, "Operational event recorded by AccordOps.", "system", None


@router.get("/audit", response_model=list[AuditItem])
def list_audit_logs(
    limit: int = Query(default=100, ge=1, le=250),
    current_user: AuthContext = Depends(get_current_user),
) -> list[dict]:
    rows = (
        get_supabase_admin()
        .table("audit_logs")
        .select("id, actor_type, entity_type, entity_id, action, details, created_at")
        .eq("organization_id", current_user.organization_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    ).data or []

    output = []
    for row in rows:
        details = row.get("details") or {}
        title, summary, category, status = _event_presentation(row["action"], details)
        output.append(
            {
                **row,
                "entity_id": str(row["entity_id"]) if row.get("entity_id") else None,
                "title": title,
                "summary": summary,
                "category": category,
                "status": status,
            }
        )
    return output
