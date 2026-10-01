from datetime import datetime

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    match_id: int
    claim_id: int | None
    title: str
    message: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}

class UnreadNotificationCountResponse(BaseModel):
    count: int