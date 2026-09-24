from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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