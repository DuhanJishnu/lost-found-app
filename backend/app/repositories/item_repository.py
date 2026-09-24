from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.item import Item, ItemStatus, ItemType
from app.models.item_image import ItemImage

class ItemRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_with_images(
        self,
        item: Item,
        image_keys: list[tuple[str, str]],
    ) -> Item:

        self.db.add(item)

        for object_key, content_type in image_keys:
            item.images.append(
                ItemImage(
                    object_key=object_key,
                    content_type=content_type,
                )
            )

        await self.db.commit()

        result = await self.db.execute(
            select(Item)
            .options(selectinload(Item.images))
            .where(Item.id == item.id)
        )

        return result.scalar_one()

    async def get_by_id(
        self,
        item_id: int,
    ) -> Item | None:

        result = await self.db.execute(
            select(Item)
            .options(selectinload(Item.images))
            .where(Item.id == item_id)
        )

        return result.scalar_one_or_none()

    async def get_by_id_with_images(
        self,
        item_id: int,
    ) -> Item | None:

        result = await self.db.execute(
            select(Item)
            .options(selectinload(Item.images))
            .where(Item.id == item_id)
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

        query = select(Item).options(
            selectinload(Item.images)
        )

        if item_type:
            query = query.where(Item.type == item_type)

        if category:
            query = query.where(Item.category == category)

        if status:
            query = query.where(Item.status == status)

        query = (
            query
            .order_by(Item.created_at.desc())
            .limit(limit)
            .offset(offset)
        )

        result = await self.db.execute(query)

        return list(result.scalars().all())