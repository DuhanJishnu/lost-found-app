from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.repositories.notification_repository import (
    NotificationRepository,
)
from app.schemas.notification import NotificationResponse
from app.services.notification_service import (
    NotificationService,
)


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


def get_notification_service(
    db: AsyncSession = Depends(get_db),
):
    return NotificationService(
        NotificationRepository(db)
    )


@router.get(
    "/users/{user_id}",
    response_model=list[NotificationResponse],
)
async def get_notifications(
    user_id: int,
    service: NotificationService = Depends(
        get_notification_service
    ),
):
    return await service.get_user_notifications(
        user_id
    )