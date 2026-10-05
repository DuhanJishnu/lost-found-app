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
    # Phase 8.7: short-lived JWT from POST /claims/answers proving the
    # claimant completed the ownership questionnaire for this pair.
    verification_token: str = Field(min_length=1)


class ClaimQuestionResponse(BaseModel):
    id: int
    category: str
    question: str

    model_config = {"from_attributes": True}


class ClaimAnswerItem(BaseModel):
    question_id: int = Field(gt=0)
    answer: str = Field(min_length=1, max_length=2000)


class SubmitClaimAnswersRequest(BaseModel):
    lost_item_id: int = Field(gt=0)
    found_item_id: int = Field(gt=0)
    answers: list[ClaimAnswerItem] = Field(min_length=1, max_length=50)


class SubmitClaimAnswersResponse(BaseModel):
    passed: bool
    score: float = Field(ge=0, le=1)
    verification_token: str | None = None
    found_item_id: int
    lost_item_id: int
