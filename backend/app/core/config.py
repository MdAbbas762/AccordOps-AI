from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AccordOps AI API"
    app_version: str = "0.3.0"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"

    frontend_origin: str = "http://localhost:3000"
    public_api_base_url: str = "http://host.docker.internal:8000/api/v1"

    supabase_url: str = ""
    supabase_publishable_key: str = ""
    supabase_secret_key: str = ""

    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash-lite"
    ai_mode: str = "auto"

    n8n_base_url: str = "http://localhost:5678"
    n8n_evidence_webhook_url: str = ""
    n8n_action_webhook_url: str = ""
    n8n_webhook_secret: str = ""
    slack_webhook_url: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @property
    def supabase_configured(self) -> bool:
        return bool(
            self.supabase_url
            and self.supabase_publishable_key
            and self.supabase_secret_key
        )

    @property
    def resolved_ai_mode(self) -> str:
        mode = self.ai_mode.strip().lower()
        if mode == "auto":
            return "gemini" if self.gemini_api_key else "local_rules"
        if mode in {"demo", "rules", "local"}:
            return "local_rules"
        return mode

    @property
    def automation_mode(self) -> str:
        if (
            self.n8n_evidence_webhook_url
            and self.n8n_action_webhook_url
            and self.n8n_webhook_secret
        ):
            return "n8n"
        return "local"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
