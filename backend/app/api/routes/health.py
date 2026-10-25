import logging

from fastapi import APIRouter, HTTPException, status

from app.core.config import settings
from app.services.automation import n8n_health
from app.services.supabase import get_supabase_admin


router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/health")
def health_check() -> dict:
    n8n_reachable, _ = n8n_health()
    return {
        "status": "ok",
        "service": settings.app_name,
        "environment": settings.environment,
        "version": settings.app_version,
        "ai_mode": settings.resolved_ai_mode,
        "automation_mode": settings.automation_mode,
        "n8n_reachable": n8n_reachable,
    }


@router.get("/health/supabase")
def supabase_health_check() -> dict[str, str]:
    if not settings.supabase_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase environment variables are not configured",
        )

    try:
        supabase = get_supabase_admin()
        supabase.table("organizations").select("id").limit(1).execute()
        return {"status": "ok", "database": "supabase"}
    except Exception as exc:
        logger.exception("Supabase health check failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase connection failed",
        ) from exc
