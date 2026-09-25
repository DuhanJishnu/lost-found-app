from datetime import datetime

from pydantic import BaseModel


class SimilarItemResponse(BaseModel):
    item_id: int
    title: str
    description: str
    category: str
    type: str
    similarity_score: float # 1 - cosine_distance

class MatchResponse(BaseModel):
    id: int
    lost_item_id: int
    found_item_id: int
    similarity_score: float
    created_at: datetime

    model_config = {
        "from_attributes": True
    }