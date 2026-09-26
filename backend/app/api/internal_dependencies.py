from fastapi import Header, HTTPException, status

from app.config import get_settings


async def verify_internal_secret(
    x_internal_secret: str | None = Header(default=None),
):
    settings = get_settings()

    if (
        x_internal_secret is None
        or x_internal_secret != settings.internal_api_secret
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal API secret",
        )