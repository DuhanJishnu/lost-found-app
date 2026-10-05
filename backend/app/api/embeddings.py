from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user_id
from app.db.database import get_db
from app.repositories.item_embedding_repository import (
    ItemEmbeddingRepository,
)
from app.repositories.item_repository import ItemRepository
from app.schemas.embedding import GenerateEmbeddingResponse
from app.schemas.match import SimilarItemResponse
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
        item_repository=ItemRepository(db),
    )


# NOTE (Phase 6.3 decision): the embeddings routes are internal/worker
# support — the ARQ worker calls ItemEmbeddingService directly, and the
# frontend never calls these endpoints. Both routes require authentication
# and item ownership so they cannot be used to probe or enumerate
# other users' items.
@router.post(
    "/items/{item_id}",
    response_model=GenerateEmbeddingResponse,
    deprecated=True,
)
async def generate_item_embedding(
    item_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    service: ItemEmbeddingService = Depends(
        get_item_embedding_service
    ),
):
    item_repository = ItemRepository(db)

    item = await item_repository.get_by_id_for_user(
        item_id=item_id,
        user_id=user_id,
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

@router.get(
    "/items/{item_id}/similar",
    response_model=list[SimilarItemResponse],
    deprecated=True,
)
async def search_similar_items(
    item_id: int,
    limit: int = 10,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    service: ItemEmbeddingService = Depends(
        get_item_embedding_service
    ),
):
    owner_check = await ItemRepository(db).get_by_id_for_user(
        item_id=item_id,
        user_id=user_id,
    )

    if owner_check is None:
        raise HTTPException(
            status_code=404,
            detail="Item not found",
        )

    try:
        results = await service.search_similar_items(
            item_id=item_id,
            limit=limit,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        )

    return [
        SimilarItemResponse(
            item_id=item.id,
            title=item.title,
            description=item.description,
            category=item.category,
            type=item.type.value,
            similarity_score=1 - distance,
        )
        for item, distance in results
    ]