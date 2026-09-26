from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


class NotificationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        *,
        user_id: int,
        match_id: int,
        title: str,
        message: str,
    ):
        notification = Notification(
            user_id=user_id,
            match_id=match_id,
            title=title,
            message=message,
        )

        self.db.add(notification)

        await self.db.commit()
        await self.db.refresh(notification)

        return notification

    async def get_for_user(
        self,
        user_id: int,
    ):
        result = await self.db.execute(
            select(Notification)
            .where(
                Notification.user_id == user_id
            )
            .order_by(
                Notification.created_at.desc()
            )
        )

        return result.scalars().all()