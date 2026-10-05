from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.repositories.claim_repository import ClaimRepository
from app.repositories.claim_verification_repository import (
    ClaimVerificationRepository,
)
from app.repositories.item_embedding_repository import ItemEmbeddingRepository
from app.repositories.item_repository import ItemRepository
from app.repositories.match_repository import MatchRepository
from app.services.claim_service import ClaimService
from app.services.claim_verification_service import ClaimVerificationService
from app.api.dependencies import get_current_user_id

from app.repositories.notification_repository import NotificationRepository
from app.services.notification_service import NotificationService

from app.schemas.claim import (
    ClaimQuestionResponse,
    ClaimVerificationResponse,
    ClaimResponse,
    StartClaimRequest,
    SubmitClaimAnswersRequest,
    SubmitClaimAnswersResponse,
    UpdateClaimStatusRequest,
    VerifyClaimRequest,
)

router = APIRouter(
    prefix="/claims",
    tags=["Claims"],
)


def get_claim_service(
    db: AsyncSession = Depends(get_db),
) -> ClaimService:

    claim_repository = ClaimRepository(db)
    match_repository = MatchRepository(db)
    item_repository = ItemRepository(db)
    embedding_repository = ItemEmbeddingRepository(db)

    notification_repository = NotificationRepository(db)

    notification_service = NotificationService(
        notification_repository
    )

    return ClaimService(
        db=db,
        claim_repository=claim_repository,
        match_repository=match_repository,
        item_repository=item_repository,
        embedding_repository=embedding_repository,
        notification_service=notification_service,
    )


@router.post(
    "/verify",
    response_model=ClaimVerificationResponse,
)
async def verify_claim(
    data: VerifyClaimRequest,
    user_id: int = Depends(get_current_user_id),
    service: ClaimService = Depends(get_claim_service),
):
    return await service.verify_claim_pair(
        user_id=user_id,
        lost_item_id=data.lost_item_id,
        found_item_id=data.found_item_id,
    )


def get_verification_service(
    db: AsyncSession = Depends(get_db),
) -> ClaimVerificationService:
    claim_service = get_claim_service(db)

    return ClaimVerificationService(
        db=db,
        repository=ClaimVerificationRepository(db),
        item_repository=ItemRepository(db),
        claim_service=claim_service,
    )


@router.post(
    "/questions",
    response_model=list[ClaimQuestionResponse],
)
async def get_claim_questions(
    data: VerifyClaimRequest,
    user_id: int = Depends(get_current_user_id),
    service: ClaimVerificationService = Depends(
        get_verification_service
    ),
):
    return await service.get_questions(
        user_id=user_id,
        lost_item_id=data.lost_item_id,
        found_item_id=data.found_item_id,
    )


@router.post(
    "/answers",
    response_model=SubmitClaimAnswersResponse,
)
async def submit_claim_answers(
    data: SubmitClaimAnswersRequest,
    user_id: int = Depends(get_current_user_id),
    service: ClaimVerificationService = Depends(
        get_verification_service
    ),
):
    return await service.submit_answers(
        user_id=user_id,
        lost_item_id=data.lost_item_id,
        found_item_id=data.found_item_id,
        answers=[a.model_dump() for a in data.answers],
    )


@router.post(
    "/",
    response_model=ClaimResponse,
    status_code=201,
)
async def create_claim(
    data: StartClaimRequest,
    user_id: int = Depends(get_current_user_id),
    service: ClaimService = Depends(get_claim_service),
    verification: ClaimVerificationService = Depends(
        get_verification_service
    ),
):
    # Phase 8.7: the ownership questionnaire must be completed first.
    verification.verify_token(
        token=data.verification_token,
        user_id=user_id,
        lost_item_id=data.lost_item_id,
        found_item_id=data.found_item_id,
    )

    claim = await service.create_manual_claim(
        user_id=user_id,
        lost_item_id=data.lost_item_id,
        found_item_id=data.found_item_id,
    )

    await verification.repository.link_pending_answers_to_claim(
        claimant_id=user_id,
        lost_item_id=data.lost_item_id,
        found_item_id=data.found_item_id,
        claim_id=claim.id,
    )
    await verification.db.commit()

    return claim

@router.patch(
    "/{claim_id}/status",
    response_model=ClaimResponse,
)
async def update_claim_status(
    claim_id: int,
    data: UpdateClaimStatusRequest,
    current_user_id: int = Depends(get_current_user_id),
    service: ClaimService = Depends(get_claim_service),
):
    try:
        return await service.update_claim_status(
            claim_id=claim_id,
            user_id=current_user_id,
            status=data.status,
        )

    except ValueError as exc:
        detail = str(exc)
        if "not found" in detail.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=detail,
            )
        if "already been decided" in detail.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=detail,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
        )

    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        )

@router.get(
    "",
    response_model=list[ClaimResponse],
)
async def get_claims(
    current_user_id: int = Depends(get_current_user_id),
    service: ClaimService = Depends(get_claim_service),
):
    return await service.get_claims_for_user(
        current_user_id
    )

@router.get(
    "/{claim_id}",
    response_model=ClaimResponse,
)
async def get_claim(
    claim_id: int,
    current_user_id: int = Depends(get_current_user_id),
    service: ClaimService = Depends(get_claim_service),
):
    try:
        return await service.get_claim(
            claim_id=claim_id,
            user_id=current_user_id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )