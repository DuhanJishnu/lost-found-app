from datetime import datetime

from pydantic import BaseModel


class ItemImageResponse(BaseModel):
    id: int
    object_key: str
    content_type: str
    created_at: datetime

    model_config = {
        "from_attributes": True
    }