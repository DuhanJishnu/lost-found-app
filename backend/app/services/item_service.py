from app.models.item import Item
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