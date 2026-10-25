import logging

from app.services.supabase import get_supabase_admin


logger = logging.getLogger(__name__)


def write_audit(
    *,
    organization_id: str,
    actor_type: str,
    entity_type: str,
    action: str,
    actor_user_id: str | None = None,
    entity_id: str | None = None,
    details: dict | None = None,
) -> None:
    try:
        get_supabase_admin().table("audit_logs").insert(
            {
                "organization_id": organization_id,
                "actor_user_id": actor_user_id,
                "actor_type": actor_type,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "action": action,
                "details": details or {},
            }
        ).execute()
    except Exception:
        logger.exception("Audit logging failed for %s", action)
