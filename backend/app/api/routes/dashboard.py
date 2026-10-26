from fastapi import APIRouter, Depends

from app.core.auth import AuthContext, get_current_user
from app.core.config import settings
from app.models.workflows import DashboardResponse
from app.services.supabase import get_supabase_admin


router = APIRouter()


def _count(table: str, organization_id: str, column: str | None = None, value: str | None = None) -> int:
    query = get_supabase_admin().table(table).select("id", count="exact").eq(
        "organization_id", organization_id
    )
    if column and value is not None:
        query = query.eq(column, value)
    response = query.limit(1).execute()
    return int(response.count or 0)


@router.get("/dashboard", response_model=DashboardResponse)
def dashboard(current_user: AuthContext = Depends(get_current_user)) -> dict:
    supabase = get_supabase_admin()
    active_contracts = _count("contracts", current_user.organization_id, "status", "active")
    approved_obligations = _count("obligations", current_user.organization_id, "status", "approved")
    candidate_obligations = _count("obligations", current_user.organization_id, "status", "candidate")
    open_exceptions = _count("exceptions", current_user.organization_id, "status", "open")
    open_exceptions += _count("exceptions", current_user.organization_id, "status", "investigating")
    open_exceptions += _count("exceptions", current_user.organization_id, "status", "pending_approval")
    pending_approvals = _count("approvals", current_user.organization_id, "status", "pending")

    recent_exceptions = (
        supabase.table("exceptions")
        .select("id, title, summary, severity, status, detected_at")
        .eq("organization_id", current_user.organization_id)
        .order("detected_at", desc=True)
        .limit(5)
        .execute()
    ).data or []
    recent_activity = (
        supabase.table("audit_logs")
        .select("id, actor_type, action, entity_type, details, created_at")
        .eq("organization_id", current_user.organization_id)
        .order("created_at", desc=True)
        .limit(6)
        .execute()
    ).data or []

    return {
        "active_contracts": active_contracts,
        "approved_obligations": approved_obligations,
        "candidate_obligations": candidate_obligations,
        "open_exceptions": open_exceptions,
        "pending_approvals": pending_approvals,
        "automation_mode": settings.automation_mode,
        "ai_mode": settings.resolved_ai_mode,
        "recent_exceptions": recent_exceptions,
        "recent_activity": recent_activity,
    }
