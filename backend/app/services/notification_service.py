from app.models.notification import Notification
from app.repositories.notification_repository import (
    NotificationRepository,
)


class NotificationService:
    def __init__(
        self,
        repository: NotificationRepository,
    ):
        self.repository = repository

    async def notify_match(
        self,
        *,
        user_id: int,
        match_id: int,
        similarity_score: float,
    ):
        return await self.repository.create(
            user_id=user_id,
            match_id=match_id,
            title="Possible match found",
            message=(
                "A found item looks similar to your lost item. "
                f"Similarity score: {similarity_score:.2f}"
            ),
        )

    async def get_user_notifications(
        self,
        user_id: int,
    ):
        return await self.repository.get_for_user(
            user_id
        )

    async def notify_claim_created(
        self,
        *,
        user_id: int,
        claim_id: int,
        match_id: int,
    ) -> Notification:
        return await self.repository.create(
            user_id=user_id,
            match_id=match_id,
            claim_id=claim_id,
            title="New claim received",
            message=(
                "Someone has claimed the item you reported as found."
            ),
        )
    
    async def notify_claim_accepted(
        self,
        *,
        user_id: int,
        match_id: int,
        claim_id: int
    ) -> Notification:
        return await self.repository.create(
            user_id=user_id,
            match_id=match_id,
            claim_id=claim_id,
            title="Claim accepted",
            message=(
                "Your claim was accepted. "
                "The lost and found items have been closed."
            ),
        )


    async def notify_claim_rejected(
        self,
        *,
        user_id: int,
        match_id: int,
        claim_id: int,
    ) -> Notification:
        return await self.repository.create(
            user_id=user_id,
            match_id=match_id,
            claim_id=claim_id,
            title="Claim rejected",
            message=(
                "Your claim was rejected. "
                "The item is available for matching again."
            ),
        )

    async def mark_as_read(
        self,
        *,
        notification_id: int,
        user_id: int,
    ):
        notification = await self.repository.mark_as_read(
            notification_id=notification_id,
            user_id=user_id,
        )

        if notification is None:
            raise ValueError("Notification not found")

        return notification

    async def get_unread_count(
        self,
        user_id: int,
    ) -> int:
        return await self.repository.get_unread_count(user_id)