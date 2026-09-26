from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str

    r2_account_id: str
    r2_access_key_id: str
    r2_secret_access_key: str
    r2_bucket_name: str

    gemini_api_key: str
    gemini_embedding_model: str = "gemini-embedding-2"
    gemini_embedding_dimension: int = 768

    redis_url: str = "redis://localhost:6379/0"

    auth_secret: str

    internal_api_secret: str

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()