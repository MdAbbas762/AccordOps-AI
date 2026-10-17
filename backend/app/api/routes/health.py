import logging

from fastapi import APIRouter, HTTPException, status

from app.core.config import settings
from app.services.supabase import get_supabase_admin


router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/health")
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "service": settings.app_name,
        "environment": settings.environment,
        "version": settings.app_version,
    }


@router.get("/health/supabase")
def supabase_health_check() -> dict[str, str]:
    try:
        supabase = get_supabase_admin()

        supabase.table("organizations").select("id").limit(1).execute()

        return {
            "status": "ok",
            "database": "supabase",
        }

    except Exception:
        logger.exception("Supabase health check failed")

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase connection failed",
        )
