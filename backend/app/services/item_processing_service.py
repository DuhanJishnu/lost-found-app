from app.repositories.item_embedding_repository import (
    ItemEmbeddingRepository,
)
from app.repositories.item_repository import ItemRepository
from app.repositories.match_repository import MatchRepository
from app.repositories.notification_repository import NotificationRepository
from app.services.embedding_service import EmbeddingService
from app.services.item_embedding_service import ItemEmbeddingService
from app.services.match_service import MatchService
from app.services.notification_service import NotificationService
from app.services.storage_service import StorageService


# Background job processing for the embeddding and match creation
class ItemProcessingService:
    def __init__(self, db):
        item_repository = ItemRepository(db)

        embedding_repository = ItemEmbeddingRepository(db)

        match_repository = MatchRepository(db)
        notification_repository = NotificationRepository(db)

        self.item_repository = item_repository

        self.embedding_service = ItemEmbeddingService(
            embedding_repository=embedding_repository,
            embedding_service=EmbeddingService(),
            storage_service=StorageService(),
            item_repository=item_repository,
        )

        self.match_service = MatchService(
            item_repository=item_repository,
            embedding_repository=embedding_repository,
            match_repository=match_repository,
            notification_service=NotificationService(
                notification_repository
            ),
        )

    async def process_item(self, item_id: int):
        # 1. Get item
        item = await self.item_repository.get_by_id_with_images(
            item_id
        )

        if item is None:
            raise ValueError("Item not found")

        if not item.images:
            raise ValueError("Item has no images")

        # 2. Generate embedding
        await self.embedding_service.generate_for_item(
            item_id=item.id,
            description=item.description,
            image_key=item.images[0].object_key,
        )

        # 3. Find and store matches
        matches = await self.match_service.find_matches(
            item_id=item.id
        )

        return matches