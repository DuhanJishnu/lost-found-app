from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user_id
from app.db.database import get_db
from app.repositories.item_embedding_repository import (
    ItemEmbeddingRepository,
)
from app.repositories.item_repository import ItemRepository
from app.repositories.match_repository import MatchRepository
from app.schemas.match import (
    MatchResponse,
    UpdateMatchStatusRequest,
)
from app.models.match import MatchStatus
from app.services.match_service import MatchService

from app.repositories.notification_repository import NotificationRepository
from app.services.notification_service import NotificationService

router = APIRouter(
    prefix="/matches",
    tags=["Matches"],
)


def get_match_service(
    db: AsyncSession = Depends(get_db),
) -> MatchService:

    notification_repository = (
        NotificationRepository(db)
    )

    notification_service = NotificationService(
        notification_repository
    )

    return MatchService(
        item_repository=ItemRepository(db),
        embedding_repository=ItemEmbeddingRepository(db),
        match_repository=MatchRepository(db),
        notification_service=notification_service,
    )


@router.post(
    "/items/{item_id}/find",
    response_model=list[MatchResponse],
)
async def find_matches(
    item_id: int,
    current_user_id: int = Depends(
        get_current_user_id
    ),
    db: AsyncSession = Depends(get_db),
    service: MatchService = Depends(get_match_service),
):
    item = await ItemRepository(db).get_by_id_for_user(
        item_id=item_id,
        user_id=current_user_id,
    )

    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Item not found",
        )

    try:
        matches = await service.find_matches(
            item_id=item_id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )

    return matches

@router.patch(
    "/{match_id}/status",
    response_model=MatchResponse,
)
async def update_match_status(
    match_id: int,
    data: UpdateMatchStatusRequest,
    user_id: int = Depends(
        get_current_user_id
    ),
    service: MatchService = Depends(
        get_match_service
    ),
):
    try:
        return await service.update_match_status(
            match_id=match_id,
            user_id=user_id,
            status=data.status,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )

    except PermissionError as exc:
        raise HTTPException(
            status_code=403,
            detail=str(exc),
        )