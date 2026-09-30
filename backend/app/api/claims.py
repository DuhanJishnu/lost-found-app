from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.repositories.claim_repository import ClaimRepository
from app.repositories.item_repository import ItemRepository
from app.repositories.match_repository import MatchRepository
from app.schemas.claim import CreateClaimRequest, ClaimResponse
from app.services.claim_service import ClaimService
from app.api.dependencies import get_current_user_id


router = APIRouter(
    prefix="/claims",
    tags=["Claims"],
)


def get_claim_service(
    db: AsyncSession = Depends(get_db),
) -> ClaimService:
    return ClaimService(
        claim_repository=ClaimRepository(db),
        match_repository=MatchRepository(db),
        item_repository=ItemRepository(db),
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