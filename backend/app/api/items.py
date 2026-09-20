from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.item import ItemStatus, ItemType
from app.repositories.item_repository import ItemRepository
from app.schemas.item import CreateItemRequest, ItemResponse
from app.services.item_service import ItemService


router = APIRouter(
    prefix="/items",
    tags=["Items"],
)


def get_item_service(
    db: AsyncSession = Depends(get_db),
) -> ItemService:

    repository = ItemRepository(db)

    return ItemService(repository)


@router.post(
    "",
    response_model=ItemResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_item(
    data: CreateItemRequest,
    service: ItemService = Depends(get_item_service),
):
    # Temporary user until authentication is implemented.
    user_id = 1

    return await service.create_item(
        user_id=user_id,
        data=data,
    )

@router.get(
    "",
    response_model=list[ItemResponse],
)
async def get_items(
    item_type: ItemType | None = Query(default=None),
    category: str | None = Query(default=None),
    status: ItemStatus | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    service: ItemService = Depends(get_item_service),
):
    return await service.get_items(
        item_type=item_type,
        category=category,
        status=status,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/{item_id}",
    response_model=ItemResponse,
)
async def get_item(
    item_id: int,
    service: ItemService = Depends(get_item_service),
):
    item = await service.get_item(item_id)

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )

    return item