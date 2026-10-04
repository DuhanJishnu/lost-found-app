from datetime import datetime

from pydantic import BaseModel, Field

from app.models.claim import ClaimStatus


class CreateClaimRequest(BaseModel):
    match_id: int


class VerifyClaimRequest(BaseModel):
    lost_item_id: int = Field(gt=0)
    found_item_id: int = Field(gt=0)


class ClaimVerificationResponse(BaseModel):
    valid: bool
    found_item_id: int
    lost_item_id: int
    similarity_score: float


class UpdateClaimStatusRequest(BaseModel):
    status: ClaimStatus

class ClaimResponse(BaseModel):
    id: int
    match_id: int
    claimant_id: int
    status: ClaimStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class StartClaimRequest(BaseModel):
    lost_item_id: int = Field(gt=0)
    found_item_id: int = Field(gt=0)
