from fastapi import APIRouter, Depends

from app.core.auth import AuthContext, get_current_user
from app.services.supabase import get_supabase_admin


router = APIRouter()
PROVIDERS = ["jira", "hubspot", "stripe", "slack", "n8n"]


@router.get("/integrations")
def list_integrations(
    current_user: AuthContext = Depends(get_current_user),
) -> list[dict]:
    rows = (
        get_supabase_admin()
        .table("integrations")
        .select("provider, display_name, status, last_synced_at, last_error")
        .eq("organization_id", current_user.organization_id)
        .execute()
    ).data or []
    existing = {row["provider"]: row for row in rows}
    return [
        existing.get(
            provider,
            {
                "provider": provider,
                "display_name": None,
                "status": "disconnected",
                "last_synced_at": None,
                "last_error": None,
            },
        )
        for provider in PROVIDERS
    ]
