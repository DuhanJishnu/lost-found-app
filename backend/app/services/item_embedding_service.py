from app.models.item_embedding import ItemEmbedding
from app.repositories.item_embedding_repository import (
    ItemEmbeddingRepository,
)
from app.services.embedding_service import EmbeddingService
from app.services.storage_service import StorageService


class ItemEmbeddingService:

    def __init__(
        self,
        embedding_repository: ItemEmbeddingRepository,
        embedding_service: EmbeddingService,
        storage_service: StorageService,
    ):
        self.embedding_repository = embedding_repository
        self.embedding_service = embedding_service
        self.storage_service = storage_service

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