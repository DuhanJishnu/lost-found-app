from app.models.item import Item, ItemStatus, ItemType
from app.repositories.item_repository import ItemRepository
from app.schemas.item import CreateItemRequest


class ItemService:

    def __init__(
        self,
        repository: ItemRepository,
    ):
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
            latitude=data.latitude,
            longitude=data.longitude,
        )

        image_keys = [
            (key, self._get_content_type(key))
            for key in data.image_keys
        ]

        return await self.repository.create_with_images(
            item,
            image_keys,
        )

    @staticmethod
    def _get_content_type(
        object_key: str,
    ) -> str:

        extension = object_key.rsplit(".", 1)[-1].lower()

        content_types = {
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",
            "webp": "image/webp",
        }

        return content_types.get(
            extension,
            "application/octet-stream",
        )

    async def get_item(
        self,
        item_id: int,
    ) -> Item | None:

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