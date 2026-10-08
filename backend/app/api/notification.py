from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.repositories.notification_repository import (
    NotificationRepository,
)
from app.schemas.notification import NotificationResponse, UnreadNotificationCountResponse
from app.services.notification_service import (
    NotificationService,
)

from app.api.dependencies import get_current_user_id

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
    "",
    response_model=list[NotificationResponse],
)
async def get_notifications(
    current_user_id: int = Depends(
        get_current_user_id
    ),
    service: NotificationService = Depends(
        get_notification_service
    ),
    limit: int = Query(default=50, ge=1, le=100),
):
    return await service.get_user_notifications(
        current_user_id,
        limit=limit,
    )

@router.patch(
    "/read-all",
    response_model=dict,
)
async def mark_all_notifications_as_read(
    current_user_id: int = Depends(get_current_user_id),
    service: NotificationService = Depends(get_notification_service),
):
    marked = await service.mark_all_as_read(
        current_user_id
    )

    return {"marked_read": marked}

@router.get(
    "/unread-count",
    response_model=UnreadNotificationCountResponse,
)
async def get_unread_count(
    current_user_id: int = Depends(get_current_user_id),
    service: NotificationService = Depends(get_notification_service),
):
    count = await service.get_unread_count(
        current_user_id
    )

    return UnreadNotificationCountResponse(
        count=count
    )

@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
)
async def mark_notification_as_read(
    notification_id: int,
    current_user_id: int = Depends(get_current_user_id),
    service: NotificationService = Depends(get_notification_service),
):
    try:
        return await service.mark_as_read(
            notification_id=notification_id,
            user_id=current_user_id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )