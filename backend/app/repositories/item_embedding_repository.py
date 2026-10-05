from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.item import Item, ItemStatus, ItemType
from app.models.item_embedding import ItemEmbedding


class ItemEmbeddingRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        embedding: ItemEmbedding,
    ) -> ItemEmbedding:

        self.db.add(embedding)

        await self.db.commit()
        await self.db.refresh(embedding)

        return embedding

    async def get_by_item_id(
        self,
        item_id: int,
    ) -> ItemEmbedding | None:

        result = await self.db.execute(
            select(ItemEmbedding)
            .where(ItemEmbedding.item_id == item_id)
        )

        return result.scalar_one_or_none()

    async def search_similar_items(
        self,
        query_embedding: list[float],
        target_type: ItemType,
        limit: int = 10,
    ):
        distance = ItemEmbedding.embedding.cosine_distance(
            query_embedding
        )

        result = await self.db.execute(
            select(
                Item,
                distance.label("distance"),
            )
            .join(
                ItemEmbedding,
                ItemEmbedding.item_id == Item.id,
            )
            .where(
                Item.type == target_type,
                Item.status == ItemStatus.ACTIVE,
            )
            .order_by(distance)
            .limit(limit)
        )

        return result.all()

    async def search_found_candidates(
        self,
        query_embedding: list[float],
        exclude_user_id: int,
        limit: int = 100,
        category: str | None = None,
        search: str | None = None,
    ):
        """pgvector nearest-neighbor search over ACTIVE FOUND items.

        Filters (ACTIVE-only, exclude own items, category, text search)
        are applied in SQL so only top-K candidates cross the DB boundary.
        """
        distance = ItemEmbedding.embedding.cosine_distance(
            query_embedding
        )

        query = (
            select(
                ItemEmbedding,
                distance.label("distance"),
            )
            .join(Item, Item.id == ItemEmbedding.item_id)
            .where(
                Item.type == ItemType.FOUND,
                Item.status == ItemStatus.ACTIVE,
                Item.user_id != exclude_user_id,
            )
            .options(
                selectinload(ItemEmbedding.item)
                .selectinload(Item.images)
            )
        )

        if category:
            query = query.where(Item.category.ilike(category))

        if search:
            like = f"%{search}%"
            query = query.where(
                (Item.title.ilike(like))
                | (Item.description.ilike(like))
            )

        query = query.order_by(distance).limit(limit)

        result = await self.db.execute(query)

        return list(result.all())

    async def get_active_found_embeddings(
        self,
        user_id: int,
    ):
        result = await self.db.execute(
            select(ItemEmbedding)
            .join(Item, Item.id == ItemEmbedding.item_id)
            .where(
                Item.type == ItemType.FOUND,
                Item.status == ItemStatus.ACTIVE,
                Item.user_id != user_id,
            )
            .options(
                selectinload(ItemEmbedding.item)
                .selectinload(Item.images)
            )
        )

        return list(result.scalars().all())

    async def get_found_embedding_for_user(
        self,
        item_id: int,
        user_id: int,
    ):
        result = await self.db.execute(
            select(ItemEmbedding)
            .join(Item, Item.id == ItemEmbedding.item_id)
            .where(
                Item.id == item_id,
                Item.type == ItemType.FOUND,
                Item.status == ItemStatus.ACTIVE,
                Item.user_id != user_id,
            )
            .options(
                selectinload(ItemEmbedding.item)
                .selectinload(Item.images)
            )
        )

        return result.scalar_one_or_none()