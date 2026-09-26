from datetime import datetime, timedelta, timezone

import jwt

from app.config import get_settings


class AuthService:
    def __init__(self):
        self.settings = get_settings()

    def create_api_token(
        self,
        user_id: int,
    ) -> str:
        now = datetime.now(timezone.utc)

        payload = {
            "sub": str(user_id),
            "iat": now,
            "exp": now + timedelta(hours=1),
        }

        return jwt.encode(
            payload,
            self.settings.auth_secret,
            algorithm="HS256",
        )

    def verify_api_token(
        self,
        token: str,
    ) -> int:
        payload = jwt.decode(
            token,
            self.settings.auth_secret,
            algorithms=["HS256"],
        )

        return int(payload["sub"])