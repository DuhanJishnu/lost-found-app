from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.repositories.item_embedding_repository import (
    ItemEmbeddingRepository,
)
from app.repositories.item_repository import ItemRepository
from app.schemas.embedding import GenerateEmbeddingResponse
from app.services.embedding_service import EmbeddingService
from app.services.item_embedding_service import (
    ItemEmbeddingService,
)
from app.services.storage_service import StorageService


router = APIRouter(
    prefix="/embeddings",
    tags=["Embeddings"],
)


def get_item_embedding_service(
    db: AsyncSession = Depends(get_db),
) -> ItemEmbeddingService:

    return ItemEmbeddingService(
        embedding_repository=ItemEmbeddingRepository(db),
        embedding_service=EmbeddingService(),
        storage_service=StorageService(),
    )


@router.post(
    "/items/{item_id}",
    response_model=GenerateEmbeddingResponse,
)
async def generate_item_embedding(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    service: ItemEmbeddingService = Depends(
        get_item_embedding_service
    ),
):
    item_repository = ItemRepository(db)

    item = await item_repository.get_by_id_with_images(
        item_id
    )

    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Item not found",
        )

    if not item.images:
        raise HTTPException(
            status_code=400,
            detail="Item has no images",
        )

    image = item.images[0]

    embedding = await service.generate_for_item(
        item_id=item.id,
        description=item.description,
        image_key=image.object_key,
    )

    return GenerateEmbeddingResponse(
        item_id=item.id,
        embedding_id=embedding.id,
        dimension=len(embedding.embedding),
        model=embedding.model,
    )