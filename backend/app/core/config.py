"""Runtime configuration for VeriBrand AI."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore")

    # SecretStr keeps the key out of repr()/logs
    gemini_api_key: SecretStr | None = None
    ai_model: str = "gemini-2.5-flash"
    database_url: str = "sqlite:///./veribrand.db"
    cors_origins: str = "http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174,http://localhost:8080"
    auth_mode: str = Field(default="demo", pattern="^(demo|jwt)$")
    public_base_url: str = "http://localhost:8000"
    data_dir: Path = BACKEND_DIR / "data"
    jwt_secret: SecretStr | None = None

    # Brand Readiness Score default penalty weights
    factual_weight: float = 25.0
    visual_weight: float = 12.0
    tone_weight: float = 5.0

    # Governance thresholds
    fast_track_threshold: float = 95.0
    friction_override_threshold: float = 0.25  # 25% override triggers friction alert
    friction_min_occurrences: int = 3

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def upload_dir(self) -> Path:
        p = self.data_dir / "uploads"
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def has_gemini_key(self) -> bool:
        return bool(self.gemini_api_key and self.gemini_api_key.get_secret_value().strip())


@lru_cache
def get_settings() -> Settings:
    return Settings()
