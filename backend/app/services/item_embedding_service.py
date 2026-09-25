from app.models.item import ItemType
from app.models.item_embedding import ItemEmbedding

from app.repositories.item_embedding_repository import (
    ItemEmbeddingRepository,
)
from app.services.embedding_service import EmbeddingService
from app.services.storage_service import StorageService

class ItemEmbeddingService:

    def __init__(
        self,
        embedding_repository,
        embedding_service,
        storage_service,
        item_repository,
    ):
        self.embedding_repository = embedding_repository
        self.embedding_service = embedding_service
        self.storage_service = storage_service
        self.item_repository = item_repository

    async def generate_for_item(
        self,
        *,
        item_id: int,
        description: str,
        image_key: str,
    ) -> ItemEmbedding:

        existing = (
            await self.embedding_repository
            .get_by_item_id(item_id)
        )

        if existing:
            return existing

        image_bytes, mime_type = (
            self.storage_service.get_object(
                object_key=image_key,
            )
        )

        vector = (
            await self.embedding_service
            .generate_item_embedding(
                description=description,
                image_bytes=image_bytes,
                mime_type=mime_type,
            )
        )

        embedding = ItemEmbedding(
            item_id=item_id,
            embedding=vector,
            model=self.embedding_service.model,
        )

        return await self.embedding_repository.create(
            embedding
        )

    async def search_similar_items(
        self,
        *,
        item_id: int,
        limit: int = 10,
    ):
        query_embedding = (
            await self.embedding_repository.get_by_item_id(item_id)
        )

        if query_embedding is None:
            raise ValueError(
                "Embedding not found for this item"
            )

        item = await self.item_repository.get_by_id(item_id)

        if item is None:
            raise ValueError(
                "Item not found"
            )

        if item.type == ItemType.LOST:
            target_type = ItemType.FOUND
        else:
            target_type = ItemType.LOST

        results = await self.embedding_repository.search_similar_items(
            query_embedding=query_embedding.embedding,
            target_type=target_type,
            limit=limit,
        )

        return results