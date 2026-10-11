from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_google_id(
        self,
        google_id: str,
    ) -> User | None:
        result = await self.db.execute(
            select(User).where(
                User.google_id == google_id
            )
        )

        return result.scalar_one_or_none()

    async def get_by_id(
        self,
        user_id: int,
    ) -> User | None:
        result = await self.db.execute(
            select(User).where(
                User.id == user_id
            )
        )

        return result.scalar_one_or_none()

    async def get_by_email(
        self,
        email: str,
    ) -> User | None:
        result = await self.db.execute(
            select(User).where(
                User.email == email
            )
        )

        return result.scalar_one_or_none()

    async def create(
        self,
        *,
        name: str,
        email: str,
        google_id: str | None = None,
        password_hash: str | None = None,
    ) -> User:
        user = User(
            google_id=google_id,
            password_hash=password_hash,
            name=name,
            email=email,
        )

        self.db.add(user)

        await self.db.commit()
        await self.db.refresh(user)

        return user