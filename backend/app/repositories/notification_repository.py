from sqlalchemy import select, update, func
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
        claim_id: int | None = None,
    ):
        notification = Notification(
            user_id=user_id,
            match_id=match_id,
            claim_id=claim_id,
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

    async def mark_as_read(
        self,
        *,
        notification_id: int,
        user_id: int,
    ) -> Notification | None:

        result = await self.db.execute(
            update(Notification)
            .where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
            .values(is_read=True)
            .returning(Notification)
        )

        notification = result.scalar_one_or_none()

        if notification is None:
            return None

        await self.db.commit()

        return notification

    async def get_unread_count(
        self,
        user_id: int,
    ) -> int:
        result = await self.db.execute(
            select(func.count(Notification.id))
            .where(
                Notification.user_id == user_id,
                Notification.is_read.is_(False),
            )
        )

        return result.scalar_one()