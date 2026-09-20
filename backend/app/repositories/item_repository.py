from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.item import Item, ItemStatus, ItemType
from app.models.item_image import ItemImage

class ItemRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_with_image(
        self,
        item: Item,
        image: ItemImage | None = None,
    ) -> Item:

        self.db.add(item)

        if image:
            item.images.append(image)

        await self.db.commit()
        await self.db.refresh(item)

        return item

    async def get_by_id(self, item_id: int) -> Item | None:
        result = await self.db.execute(
            select(Item).where(Item.id == item_id)
        )

        return result.scalar_one_or_none()

    async def get_items(
        self,
        *,
        item_type: ItemType | None = None,
        category: str | None = None,
        status: ItemStatus | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Item]:

        query = select(Item)

        if item_type is not None:
            query = query.where(Item.type == item_type)

        if category is not None:
            query = query.where(Item.category == category)

        if status is not None:
            query = query.where(Item.status == status)

        query = (
            query
            .order_by(Item.created_at.desc())
            .limit(limit)
            .offset(offset)
        )

        result = await self.db.execute(query)

        return list(result.scalars().all())