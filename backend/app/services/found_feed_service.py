from app.repositories.item_repository import ItemRepository
from app.repositories.item_embedding_repository import ItemEmbeddingRepository
from app.schemas.found_feed import FoundFeedItemResponse, FoundItemDetailResponse, FoundFeedImageResponse

from app.services.similarity_service import SimilarityService

from app.services.storage_service import StorageService


IMAGE_THRESHOLD = 0.40


class LostItemRequiredError(Exception):
    pass


class FoundFeedService:

    def __init__(self, db):
        self.item_repository = ItemRepository(db)
        self.embedding_repository = ItemEmbeddingRepository(db)
        self.storage_service = StorageService()

    async def get_feed(
        self,
        user_id: int,
    ) -> list[FoundFeedItemResponse]:

        lost_items = await self.item_repository.get_active_lost_items_for_user(
            user_id
        )

        # User has not registered anything lost.
        if not lost_items:
            return []

        lost_embeddings = []

        for item in lost_items:
            embedding = await self.embedding_repository.get_by_item_id(item.id)

            if embedding:
                lost_embeddings.append(embedding.embedding)

        if not lost_embeddings:
            return []

        found_embeddings = (
            await self.embedding_repository.get_active_found_embeddings(
                user_id
            )
        )

        results = []

        for found_embedding in found_embeddings:

            found_vector = found_embedding.embedding

            best_similarity = max(
                SimilarityService.cosine_similarity(
                    lost_vector,
                    found_vector,
                )
                for lost_vector in lost_embeddings
            )

            item = found_embedding.item

            images = []

            if best_similarity > IMAGE_THRESHOLD:
                for image in item.images:
                    images.append(
                        FoundFeedImageResponse(
                            id=image.id,
                            image_url=self.storage_service.generate_download_url(
                                object_key=image.object_key,
                            ),
                        )
                    )

            results.append(
                FoundFeedItemResponse(
                    id=item.id,
                    title=item.title,
                    description=item.description,
                    category=item.category,
                    similarity_score=best_similarity,
                    can_view_image=best_similarity > IMAGE_THRESHOLD,
                    can_claim=best_similarity > IMAGE_THRESHOLD,
                    images=images,
                )
            )

        results.sort(
            key=lambda item: item.similarity_score,
            reverse=True,
        )

        return results

    async def get_item_detail(
        self,
        *,
        item_id: int,
        user_id: int,
    ) -> FoundItemDetailResponse | None:

        lost_items = await self.item_repository.get_active_lost_items_for_user(
            user_id
        )

        if not lost_items:
            raise LostItemRequiredError

        lost_embeddings = []

        for item in lost_items:
            embedding = await self.embedding_repository.get_by_item_id(item.id)

            if embedding:
                lost_embeddings.append(embedding.embedding)

        if not lost_embeddings:
            return None

        found_embedding = (
            await self.embedding_repository.get_found_embedding_for_user(
                item_id,
                user_id,
            )
        )

        if found_embedding is None:
            return None

        best_similarity = max(
            SimilarityService.cosine_similarity(
                lost_vector,
                found_embedding.embedding,
            )
            for lost_vector in lost_embeddings
        )


        can_view_image = best_similarity > IMAGE_THRESHOLD

        images = []

        if can_view_image:
            for image in found_embedding.item.images:
                images.append(
                    FoundFeedImageResponse(
                        id=image.id,
                        image_url=self.storage_service.generate_download_url(
                            object_key=image.object_key,
                        ),
                    )
                )

        return FoundItemDetailResponse(
            id=found_embedding.item.id,
            title=found_embedding.item.title,
            description=found_embedding.item.description,
            category=found_embedding.item.category,
            similarity_score=best_similarity,
            can_view_image=can_view_image,
            can_claim=can_view_image,
            images=images,
        )