from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
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