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