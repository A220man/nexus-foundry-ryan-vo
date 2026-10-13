"""Application configuration."""
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_name: str = "Nexus Foundry"
    app_version: str = "1.0.0"
    debug: bool = False

    # Database
    database_url: str = "sqlite+aiosqlite:///./data/nexus.db"

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # Storage
    storage_path: Path = Path("./data/compositions")
    renders_path: Path = Path("./data/renders")

    # Rendering
    chrome_path: str | None = None
    ffmpeg_path: str = "ffmpeg"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()