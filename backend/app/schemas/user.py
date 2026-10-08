from datetime import datetime

from pydantic import BaseModel, Field


class UserProfileStats(BaseModel):
    items_lost: int = Field(ge=0)
    items_found: int = Field(ge=0)
    active_matches: int = Field(ge=0)
    pending_claims_made: int = Field(ge=0)
    pending_claims_received: int = Field(ge=0)
    successful_returns: int = Field(
        ge=0,
        description="Accepted claims where this user is the finder.",
    )


class UserProfileResponse(BaseModel):
    id: int
    name: str
    email: str
    member_since: datetime
    stats: UserProfileStats

    model_config = {"from_attributes": True}
