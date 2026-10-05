from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user_id
from app.db.database import get_db
from app.models.item import ItemStatus, ItemType
from app.repositories.item_repository import ItemRepository
from app.schemas.item import CreateItemRequest, ItemResponse
from app.schemas.found_feed import FoundItemDetailResponse
from app.services.item_service import ItemService
from app.services.job_queue import enqueue_item_processing
from app.services.storage_service import StorageService
from app.services.found_feed_service import (
    FoundFeedService,
    FoundFeedItemResponse,
    LostItemRequiredError,
)

router = APIRouter(
    prefix="/items",
    tags=["Items"],
)


def get_item_service(
    db: AsyncSession = Depends(get_db),
) -> ItemService:
    repository = ItemRepository(db)
    return ItemService(repository, StorageService())


@router.post(
    "",
    response_model=ItemResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_item(
    data: CreateItemRequest,
    user_id: int = Depends(get_current_user_id),
    service: ItemService = Depends(get_item_service),
):
    try:
        item = await service.create_item(
            user_id=user_id,
            data=data,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    await enqueue_item_processing(item.id)

    return item


# NOTE (Phase 5.1 decision): the generic list exposed every item without
# ownership rules. It now requires authentication and is deprecated —
# clients must use GET /items/me (own items) or GET /items/found/feed
# (discovery). Kept temporarily for backward compatibility.
@router.get(
    "",
    response_model=list[ItemResponse],
    deprecated=True,
)
async def get_items(
    item_type: ItemType | None = Query(default=None),
    category: str | None = Query(default=None),
    status: ItemStatus | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user_id: int = Depends(get_current_user_id),
    service: ItemService = Depends(get_item_service),
):
    return await service.get_items(
        item_type=item_type,
        category=category,
        status=status,
        limit=limit,
        offset=offset,
    )

@router.get("/me", response_model=list[ItemResponse])
async def get_my_items(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    repository = ItemRepository(db)

    return await repository.get_for_user(user_id)


# NOTE: /found/feed and /found/{item_id} MUST be registered before
# the wildcard /{item_id} route — FastAPI matches routes in order.
@router.get(
    "/found/feed",
    response_model=list[FoundFeedItemResponse],
)
async def get_found_feed(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    category: str | None = Query(default=None),
    q: str | None = Query(default=None),
):
    service = FoundFeedService(db)

    return await service.get_feed(
        user_id,
        page=page,
        limit=limit,
        category=category,
        search=q,
    )


@router.get(
    "/found/{item_id}",
    response_model=FoundItemDetailResponse,
)
async def get_found_item_detail(
    item_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    service = FoundFeedService(db)

    try:
        result = await service.get_item_detail(
            item_id=item_id,
            user_id=user_id,
        )
    except LostItemRequiredError:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "LOST_ITEM_REQUIRED",
                "message": "Register your lost item first to claim a relevant found item.",
            },
        )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Found item not available",
        )

    return result


@router.get(
    "/{item_id}",
    response_model=ItemResponse | FoundItemDetailResponse,
)
async def get_item(
    item_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    repository = ItemRepository(db)

    # Own items: full response.
    own_item = await repository.get_by_id_for_user(
        item_id=item_id,
        user_id=user_id,
    )

    if own_item is not None:
        return own_item

    item = await repository.get_by_id(item_id)

    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Item not found",
        )

    # Someone else's LOST items (or non-active items) are never exposed.
    if item.type != ItemType.FOUND or item.status != ItemStatus.ACTIVE:
        raise HTTPException(
            status_code=404,
            detail="Item not found",
        )

    # Someone else's ACTIVE FOUND item: feed/detail visibility rules
    # (LOST registration required, image gated by 40% similarity).
    service = FoundFeedService(db)

    try:
        detail = await service.get_item_detail(
            item_id=item_id,
            user_id=user_id,
        )
    except LostItemRequiredError:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "LOST_ITEM_REQUIRED",
                "message": "Register your lost item first to claim a relevant found item.",
            },
        )

    if detail is None:
        raise HTTPException(
            status_code=404,
            detail="Item not found",
        )

    return detail

