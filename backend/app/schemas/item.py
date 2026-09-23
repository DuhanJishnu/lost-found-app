from enum import Enum

from pydantic import BaseModel, Field
from app.schemas.item_image import ItemImageResponse

class ItemType(str, Enum):
    LOST = "LOST"
    FOUND = "FOUND"

class CreateItemRequest(BaseModel):
    type: ItemType
    title: str = Field(min_length=2, max_length=200)
    description: str = Field(min_length=5, max_length=5000)
    category: str = Field(min_length=2, max_length=100)

    # allowing 5 images per item for now
    image_keys: list[str] = Field(
        default_factory=list,
        max_length=5,
    )

    latitude: float | None = Field(
        default=None,
        ge=-90,
        le=90,
    )

    longitude: float | None = Field(
        default=None,
        ge=-180,
        le=180,
    )

class ItemResponse(BaseModel):
    id: int
    user_id: int
    type: ItemType
    title: str
    description: str
    category: str
    latitude: float | None
    longitude: float | None
    images: list[ItemImageResponse] = Field(
        default_factory=list
    )

    model_config = {
        "from_attributes": True
    }