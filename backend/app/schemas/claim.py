from datetime import datetime

from pydantic import BaseModel

from app.models.claim import ClaimStatus


class CreateClaimRequest(BaseModel):
    match_id: int


class ClaimResponse(BaseModel):
    id: int
    match_id: int
    claimant_id: int
    status: ClaimStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}