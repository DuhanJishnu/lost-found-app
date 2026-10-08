from sqlalchemy.ext.asyncio import AsyncSession

from app.models.claim import ClaimStatus
from app.models.item import ItemType
from app.models.match import MatchStatus
from app.repositories.claim_repository import ClaimRepository
from app.repositories.item_repository import ItemRepository
from app.repositories.match_repository import MatchRepository
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserProfileResponse, UserProfileStats


class UserProfileService:
    """Assembles the data behind GET /users/me (profile screen)."""

    def __init__(
        self,
        user_repository: UserRepository,
        item_repository: ItemRepository,
        match_repository: MatchRepository,
        claim_repository: ClaimRepository,
    ):
        self.user_repository = user_repository
        self.item_repository = item_repository
        self.match_repository = match_repository
        self.claim_repository = claim_repository

    async def get_profile(
        self,
        user_id: int,
    ) -> UserProfileResponse:
        user = await self.user_repository.get_by_id(user_id)

        if user is None:
            raise ValueError("User not found")

        items = await self.item_repository.get_for_user(user_id)
        matches = await self.match_repository.get_for_user(user_id)
        claims = await self.claim_repository.get_for_user(user_id)

        return UserProfileResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            member_since=user.created_at,
            stats=UserProfileStats(
                items_lost=sum(
                    1 for item in items if item.type == ItemType.LOST
                ),
                items_found=sum(
                    1 for item in items if item.type == ItemType.FOUND
                ),
                active_matches=sum(
                    1
                    for match in matches
                    if match.status == MatchStatus.PENDING
                ),
                pending_claims_made=sum(
                    1
                    for claim in claims
                    if claim.status == ClaimStatus.PENDING
                    and claim.claimant_id == user_id
                ),
                pending_claims_received=sum(
                    1
                    for claim in claims
                    if claim.status == ClaimStatus.PENDING
                    and claim.claimant_id != user_id
                ),
                successful_returns=sum(
                    1
                    for claim in claims
                    if claim.status == ClaimStatus.ACCEPTED
                    and claim.claimant_id != user_id
                ),
            ),
        )


def build_profile_service(db: AsyncSession) -> UserProfileService:
    return UserProfileService(
        user_repository=UserRepository(db),
        item_repository=ItemRepository(db),
        match_repository=MatchRepository(db),
        claim_repository=ClaimRepository(db),
    )
