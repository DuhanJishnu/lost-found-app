from sqlalchemy.ext.asyncio import AsyncSession

from app.models.item import Item


class ItemRepository:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, item: Item) -> Item:
        self.db.add(item)

        await self.db.commit()
        await self.db.refresh(item)

        return item