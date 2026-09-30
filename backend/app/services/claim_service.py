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

    async def update_claim_status(
        self,
        *,
        claim_id: int,
        user_id: int,
        status: ClaimStatus,
    ) -> Claim:

        claim = await self.claim_repository.get_by_id(claim_id)

        if claim is None:
            raise ValueError("Claim not found")

        if claim.status != ClaimStatus.PENDING:
            raise ValueError("Claim has already been decided")

        match = await self.match_repository.get_by_id(
            claim.match_id
        )

        if match is None:
            raise ValueError("Match not found")

        if match.status != MatchStatus.CONFIRMED:
            raise ValueError(
                "Claim can only be decided for a confirmed match"
            )

        found_item = await self.item_repository.get_by_id(
            match.found_item_id
        )

        if found_item is None:
            raise ValueError("Found item not found")

        # The finder owns the FOUND item.
        if found_item.user_id != user_id:
            raise PermissionError(
                "Only the finder can accept or reject this claim"
            )

        if status == ClaimStatus.REJECTED:
            return await self.claim_repository.reject_claim(
                claim=claim,
                lost_item_id=match.lost_item_id,
                found_item_id=match.found_item_id,
            )

        if status == ClaimStatus.ACCEPTED:
            return await self.claim_repository.accept_claim(
                claim=claim,
                lost_item_id=match.lost_item_id,
                found_item_id=match.found_item_id,
            )

        raise ValueError("Invalid claim status")

    async def get_claims_for_user(
        self,
        user_id: int,
    ) -> list[Claim]:
        return await self.claim_repository.get_for_user(user_id)

    async def get_claim(
        self,
        *,
        claim_id: int,
        user_id: int,
    ) -> Claim:
        claim = await self.claim_repository.get_by_id_for_user(
            claim_id,
            user_id,
        )

        if claim is None:
            raise ValueError("Claim not found")

        return claim