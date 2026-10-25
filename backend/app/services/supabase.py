from functools import lru_cache

from supabase import Client, create_client

from app.core.config import settings


def _require(value: str, label: str) -> str:
    if not value:
        raise RuntimeError(f"{label} is not configured")
    return value


@lru_cache
def get_supabase_admin() -> Client:
    return create_client(
        _require(settings.supabase_url, "SUPABASE_URL"),
        _require(settings.supabase_secret_key, "SUPABASE_SECRET_KEY"),
    )


@lru_cache
def get_supabase_public() -> Client:
    return create_client(
        _require(settings.supabase_url, "SUPABASE_URL"),
        _require(
            settings.supabase_publishable_key,
            "SUPABASE_PUBLISHABLE_KEY",
        ),
    )
