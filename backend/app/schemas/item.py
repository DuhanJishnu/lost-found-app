from enum import Enum

from pydantic import BaseModel, Field

class ItemType(str, Enum):
    LOST = "LOST"
    FOUND = "FOUND"

class CreateItemRequest(BaseModel):
    type: ItemType
    title: str = Field(min_length=2, max_length=200)
    description: str = Field(min_length=5, max_length=5000)
    category: str = Field(min_length=2, max_length=100)

    image_url: str | None = None

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
    image_url: str | None
    latitude: float | None
    longitude: float | None

    model_config = {
        "from_attributes": True
    }