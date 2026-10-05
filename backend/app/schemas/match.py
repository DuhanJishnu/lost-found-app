from datetime import datetime

from pydantic import BaseModel
from app.models.match import MatchStatus


class SimilarItemResponse(BaseModel):
    item_id: int
    title: str
    description: str
    category: str
    type: str
    similarity_score: float # 1 - cosine_distance

class MatchItemSummary(BaseModel):
    id: int
    user_id: int
    type: str
    title: str
    category: str
    status: str

    model_config = {
        "from_attributes": True
    }

class MatchResponse(BaseModel):
    id: int
    lost_item_id: int
    found_item_id: int
    similarity_score: float
    status: MatchStatus
    created_at: datetime
    lost_item: MatchItemSummary | None = None
    found_item: MatchItemSummary | None = None

    model_config = {
        "from_attributes": True
    }

class UpdateMatchStatusRequest(BaseModel):
    status: MatchStatus