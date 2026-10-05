from app.repositories.item_embedding_repository import ItemEmbeddingRepository
from app.repositories.item_repository import ItemRepository
from app.repositories.match_repository import MatchRepository
from app.models.item import ItemType, ItemStatus
from app.models.match import MatchStatus

from app.services.matching_utils import (
    calculate_distance_km,
    calculate_location_score,
)

from app.services.notification_service import NotificationService


class MatchService:
        MATCH_THRESHOLD = 0.60

        def __init__(
            self,
            item_repository: ItemRepository,
            embedding_repository: ItemEmbeddingRepository,
            match_repository: MatchRepository,
            notification_service: NotificationService,
        ):
            self.item_repository = item_repository
            self.embedding_repository = embedding_repository
            self.match_repository = match_repository
            self.notification_service = notification_service

        async def find_matches(
            self,
            item_id: int,
            limit: int = 10,
        ):
            # 1. Get the original item
            item = await self.item_repository.get_by_id(item_id)

            if item is None:
                raise ValueError("Item not found")

            # 2. Get its embedding
            embedding = (
                await self.embedding_repository.get_by_item_id(item_id)
            )

            if embedding is None:
                raise ValueError(
                    "Embedding not found for this item"
                )

            # 3. Search only the opposite item type
            if item.type == ItemType.LOST:
                target_type = ItemType.FOUND
            else:
                target_type = ItemType.LOST

            candidates = (
                await self.embedding_repository.search_similar_items(
                    query_embedding=embedding.embedding,
                    target_type=target_type,
                    limit=limit,
                )
            )

            matches = []

            # 4. Calculate final score for every candidate
            for candidate, distance in candidates:

                embedding_score = 1 - distance

                category_score = 0.0

                if (
                    item.category is not None
                    and candidate.category is not None
                    and item.category.lower()
                    == candidate.category.lower()
                ):
                    category_score = 1.0

                location_score = 0.0

                if (
                    item.latitude is not None
                    and item.longitude is not None
                    and candidate.latitude is not None
                    and candidate.longitude is not None
                ):
                    distance_km = calculate_distance_km(
                        item.latitude,
                        item.longitude,
                        candidate.latitude,
                        candidate.longitude,
                    )

                    location_score = calculate_location_score(
                        distance_km
                    )

                final_score = (
                    0.70 * embedding_score
                    + 0.15 * category_score
                    + 0.15 * location_score
                )

                if final_score < self.MATCH_THRESHOLD:
                    continue

                if item.type == ItemType.LOST:
                    lost_item_id = item.id
                    found_item_id = candidate.id
                else:
                    lost_item_id = candidate.id
                    found_item_id = item.id

                existing_match = (
                    await self.match_repository.get_existing_match(
                        lost_item_id=lost_item_id,
                        found_item_id=found_item_id,
                    )
                )

                if existing_match:
                    matches.append(existing_match)
                    continue

                match = await self.match_repository.create(
                    lost_item_id=lost_item_id,
                    found_item_id=found_item_id,
                    similarity_score=final_score,
                )

                lost_item = await self.item_repository.get_by_id(
                    lost_item_id
                )

                await self.notification_service.notify_match(
                    user_id=lost_item.user_id,
                    match_id=match.id,
                    similarity_score=final_score,
                )

                matches.append(match)

            return matches

        async def list_matches_for_user(
            self,
            user_id: int,
        ):
            matches = await self.match_repository.get_for_user(user_id)
            return [await self._to_enriched_match(m) for m in matches]

        async def get_match_for_user(
            self,
            match_id: int,
            user_id: int,
        ):
            match = await self.match_repository.get_by_id_for_user(
                match_id=match_id,
                user_id=user_id,
            )
            if match is None:
                raise ValueError("Match not found")
            return await self._to_enriched_match(match)

        async def _to_enriched_match(self, match):
            lost_item = await self.item_repository.get_by_id(
                match.lost_item_id
            )
            found_item = await self.item_repository.get_by_id(
                match.found_item_id
            )
            return {
                "id": match.id,
                "lost_item_id": match.lost_item_id,
                "found_item_id": match.found_item_id,
                "similarity_score": match.similarity_score,
                "status": match.status,
                "created_at": match.created_at,
                "lost_item": (
                    {
                        "id": lost_item.id,
                        "user_id": lost_item.user_id,
                        "type": lost_item.type.value,
                        "title": lost_item.title,
                        "category": lost_item.category,
                        "status": lost_item.status.value,
                    }
                    if lost_item is not None
                    else None
                ),
                "found_item": (
                    {
                        "id": found_item.id,
                        "user_id": found_item.user_id,
                        "type": found_item.type.value,
                        "title": found_item.title,
                        "category": found_item.category,
                        "status": found_item.status.value,
                    }
                    if found_item is not None
                    else None
                ),
            }

        async def update_match_status(
            self,
            match_id: int,
            user_id: int,
            status: MatchStatus,
        ):
            match = await self.match_repository.get_by_id(match_id)

            if match is None:
                raise ValueError("Match not found")

            lost_item = await self.item_repository.get_by_id(
                match.lost_item_id
            )

            if lost_item is None:
                raise ValueError("Lost item not found")

            if lost_item.user_id != user_id:
                raise PermissionError("You do not own this match")

            if match.status != MatchStatus.PENDING:
                raise ValueError("Match has already been decided")

            if status == MatchStatus.REJECTED:
                rejected = await self.match_repository.update_status(
                    match_id=match.id,
                    status=MatchStatus.REJECTED,
                )
                if rejected is None:
                    raise ValueError("Match has already been decided")
                return rejected

            if status == MatchStatus.CONFIRMED:
                found_item = await self.item_repository.get_by_id(
                    match.found_item_id
                )

                if found_item is None:
                    raise ValueError("Found item not found")

                if (
                    lost_item.status != ItemStatus.ACTIVE
                    or found_item.status != ItemStatus.ACTIVE
                ):
                    raise ValueError(
                        "One of the items is no longer available"
                    )

                confirmed = await self.match_repository.confirm_match(
                    match_id=match.id,
                    lost_item_id=lost_item.id,
                    found_item_id=found_item.id,
                )
                if confirmed is None:
                    raise ValueError("Match has already been decided")
                return confirmed
            raise ValueError("Invalid match status")