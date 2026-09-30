from app.models.claim import Claim, ClaimStatus
from app.models.match import MatchStatus
from app.repositories.claim_repository import ClaimRepository
from app.repositories.item_repository import ItemRepository
from app.repositories.match_repository import MatchRepository


class ClaimService:
    def __init__(
        self,
        claim_repository: ClaimRepository,
        match_repository: MatchRepository,
        item_repository: ItemRepository,
    ):
        self.claim_repository = claim_repository
        self.match_repository = match_repository
        self.item_repository = item_repository

    async def create_claim(
        self,
        *,
        match_id: int,
        claimant_id: int,
    ) -> Claim:

        # 1. Get the match
        match = await self.match_repository.get_by_id(match_id)

        if match is None:
            raise ValueError("Match not found")

        # 2. Match must be confirmed
        if match.status != MatchStatus.CONFIRMED:
            raise ValueError(
                "A claim can only be created for a confirmed match"
            )

        # 3. Get the lost item
        lost_item = await self.item_repository.get_by_id(
            match.lost_item_id
        )

        if lost_item is None:
            raise ValueError("Lost item not found")

        # 4. Only the lost-item owner can create the claim
        if lost_item.user_id != claimant_id:
            raise PermissionError(
                "Only the owner of the lost item can create this claim"
            )

        # 5. Make sure a claim doesn't already exist
        existing_claim = await self.claim_repository.get_by_match(
            match_id
        )

        if existing_claim is not None:
            raise ValueError(
                "A claim already exists for this match"
            )

        # 6. Create the claim
        return await self.claim_repository.create(
            match_id=match_id,
            claimant_id=claimant_id,
        )