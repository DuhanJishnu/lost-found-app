import urllib.parse
from functools import lru_cache

from pydantic import model_validator
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
    upstash_redis_rest_url: str | None = None
    upstash_redis_rest_token: str | None = None

    auth_secret: str

    internal_api_secret: str

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def resolve_redis_configuration(self) -> "Settings":
        """Automatically resolves standard Redis TLS connection string for Upstash.

        If Upstash REST credentials (UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN)
        are provided and REDIS_URL is default/localhost, construct the rediss:// TLS
        connection string required by arq and redis-py.
        """
        if self.upstash_redis_rest_url and self.upstash_redis_rest_token:
            if not self.redis_url or "localhost" in self.redis_url or "127.0.0.1" in self.redis_url:
                clean_url = self.upstash_redis_rest_url.strip().strip("'\"")
                clean_token = self.upstash_redis_rest_token.strip().strip("'\"")
                parsed = urllib.parse.urlparse(clean_url)
                host = parsed.hostname or clean_url.replace("https://", "").replace("http://", "").split("/")[0]
                port = parsed.port or 6379
                self.redis_url = f"rediss://default:{clean_token}@{host}:{port}"
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
