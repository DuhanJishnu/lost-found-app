from pydantic import BaseModel


class CommunityStatsResponse(BaseModel):
    total_users: int
    items_lost: int
    items_found: int
    successful_returns: int
