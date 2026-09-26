from datetime import datetime

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    match_id: int
    title: str
    message: str
    is_read: bool
    created_at: datetime

# Pydantic response model from orm object
    model_config = {
        "from_attributes": True
    }