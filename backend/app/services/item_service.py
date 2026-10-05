from app.models.item import Item, ItemStatus, ItemType
from app.repositories.item_repository import ItemRepository
from app.schemas.item import CreateItemRequest


ALLOWED_IMAGE_EXTENSIONS = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
}

# Must match the client-side limit (ImageUploader MAX_SIZE).
MAX_IMAGE_BYTES = 5 * 1024 * 1024

# Upload URLs are issued under this folder (StorageService default).
IMAGE_KEY_PREFIX = "items/"


class ItemService:

    def __init__(
        self,
        repository: ItemRepository,
        storage,
    ):
        self.repository = repository
        self.storage = storage

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
            (key, self._validate_image_key(key))
            for key in data.image_keys
        ]

        return await self.repository.create_with_images(
            item,
            image_keys,
        )

    def _validate_image_key(
        self,
        object_key: str,
    ) -> str:
        """Server-side image validation (Phase 5.5/5.6).

        Rejects unknown extensions, keys outside the upload folder
        (MVP session scoping — full signed session binding is Phase 11),
        missing R2 objects, non-image content, and oversize files.
        Raises ValueError, which the router maps to 400.
        """
        extension = object_key.rsplit(".", 1)[-1].lower() if "." in object_key else ""

        content_type = ALLOWED_IMAGE_EXTENSIONS.get(extension)

        if content_type is None:
            raise ValueError(
                f"Unsupported image type for '{object_key}'. "
                "Allowed: jpg, jpeg, png, webp."
            )

        if not object_key.startswith(IMAGE_KEY_PREFIX):
            raise ValueError(
                f"Unknown image reference '{object_key}'. "
                "Upload the image first."
            )

        metadata = self.storage.head_object(object_key=object_key)

        if metadata is None:
            raise ValueError(
                f"Image '{object_key}' was not found. "
                "Upload it first."
            )

        size = metadata.get("ContentLength")

        if size is not None and size > MAX_IMAGE_BYTES:
            raise ValueError(
                f"Image '{object_key}' exceeds the 5 MB limit."
            )

        stored_type = metadata.get("ContentType")

        if stored_type is not None and not stored_type.startswith("image/"):
            raise ValueError(
                f"Image '{object_key}' is not a valid image."
            )

        return content_type

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