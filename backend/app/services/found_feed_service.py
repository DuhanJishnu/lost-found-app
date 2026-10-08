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

    # Per-LOST-vector candidate pool. max(100, page * limit) keeps results
    # exact at dev/test scale while bounding memory in production. pgvector
    # + HNSW makes each top-K query cheap.
    CANDIDATE_FLOOR = 100

    async def get_feed(
        self,
        user_id: int,
        page: int = 1,
        limit: int = 20,
        category: str | None = None,
        search: str | None = None,
        latitude: float | None = None,
        longitude: float | None = None,
        radius_km: float = 25.0,
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

        per_vector_k = max(
            self.CANDIDATE_FLOOR,
            page * limit,
        )

        nearby = None

        if latitude is not None or longitude is not None:
            nearby = (latitude, longitude, radius_km)

        # Phase 4.1/4.2: one pgvector nearest-neighbor query per LOST
        # embedding, then merge by best similarity per FOUND item.
        best_by_found_id: dict[int, tuple[float, object, float | None]] = {}

        for lost_vector in lost_embeddings:
            candidates = (
                await self.embedding_repository.search_found_candidates(
                    query_embedding=lost_vector,
                    exclude_user_id=user_id,
                    limit=per_vector_k,
                    category=category,
                    search=search,
                    nearby=nearby,
                )
            )

            for found_embedding, distance, geo_m in candidates:
                similarity = min(1.0, max(0.0, 1 - float(distance)))
                item_id = found_embedding.item.id

                existing = best_by_found_id.get(item_id)

                if existing is None or similarity > existing[0]:
                    best_by_found_id[item_id] = (
                        similarity,
                        found_embedding,
                        float(geo_m) / 1000.0 if geo_m is not None else None,
                    )

        ranked = sorted(
            best_by_found_id.values(),
            key=lambda pair: pair[0],
            reverse=True,
        )

        offset = (page - 1) * limit
        page_slice = ranked[offset:offset + limit]

        results = []

        for best_similarity, found_embedding, distance_km in page_slice:
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
                    created_at=item.created_at,
                    similarity_score=best_similarity,
                    can_view_image=best_similarity > IMAGE_THRESHOLD,
                    can_claim=best_similarity > IMAGE_THRESHOLD,
                    images=images,
                    distance_km=distance_km,
                )
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
            created_at=found_embedding.item.created_at,
            latitude=found_embedding.item.latitude,
            longitude=found_embedding.item.longitude,
            similarity_score=best_similarity,
            can_view_image=can_view_image,
            can_claim=can_view_image,
            images=images,
        )