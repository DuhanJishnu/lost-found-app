from app.models.item import Item, ItemStatus, ItemType
from app.repositories.item_repository import ItemRepository
from app.schemas.item import CreateItemRequest


class ItemService:

    def __init__(self, repository: ItemRepository):
        self.repository = repository

    async def create_item(
        self,
        user_id: int,
        data: CreateItemRequest,
    ) -> Item:

        item = Item(
            user_id=user_id,
            type=data.type,
            title=data.title,
            description=data.description,
            category=data.category,
            image_url=data.image_url,
            latitude=data.latitude,
            longitude=data.longitude,
        )

        return await self.repository.create(item)

    async def get_item(self, item_id: int) -> Item | None:
        return await self.repository.get_by_id(item_id)

    async def get_items(
        self,
        *,
        item_type: ItemType | None = None,
        category: str | None = None,
        status: ItemStatus | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Item]:

        return await self.repository.get_items(
            item_type=item_type,
            category=category,
            status=status,
            limit=limit,
            offset=offset,
        )