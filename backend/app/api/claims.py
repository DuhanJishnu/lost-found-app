from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.repositories.claim_repository import ClaimRepository
from app.repositories.item_embedding_repository import ItemEmbeddingRepository
from app.repositories.item_repository import ItemRepository
from app.repositories.match_repository import MatchRepository
from app.services.claim_service import ClaimService
from app.api.dependencies import get_current_user_id

from app.repositories.notification_repository import NotificationRepository
from app.services.notification_service import NotificationService

from app.schemas.claim import (
    ClaimVerificationResponse,
    CreateClaimRequest,
    ClaimResponse,
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


@router.post(
    "",
    response_model=ClaimResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_claim(
    data: CreateClaimRequest,
    current_user_id: int = Depends(get_current_user_id),
    service: ClaimService = Depends(get_claim_service),
):
    try:
        return await service.create_claim(
            match_id=data.match_id,
            claimant_id=current_user_id,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        )

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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
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