from sqlalchemy.ext.asyncio import AsyncSession

from app.models.item_image import ItemImage


class ItemImageRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        item_image: ItemImage,
    ) -> ItemImage:

        self.db.add(item_image)

        await self.db.commit()
        await self.db.refresh(item_image)

        return item_image