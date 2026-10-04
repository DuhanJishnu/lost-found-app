from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.claim import Claim, ClaimStatus
from app.models.item import ItemStatus, ItemType
from app.models.match import MatchStatus
from app.repositories.claim_repository import ClaimRepository
from app.repositories.item_embedding_repository import ItemEmbeddingRepository
from app.repositories.item_repository import ItemRepository
from app.repositories.match_repository import MatchRepository
from app.schemas.claim import ClaimVerificationResponse
from app.services.notification_service import NotificationService
from app.services.similarity_service import SimilarityService

CLAIM_SIMILARITY_THRESHOLD = 0.40

class ClaimService:
    def __init__(
        self,
        db: AsyncSession,
        claim_repository: ClaimRepository,
        match_repository: MatchRepository,
        item_repository: ItemRepository,
        embedding_repository: ItemEmbeddingRepository,
        notification_service: NotificationService,
    ):
        self.db = db
        self.claim_repository = claim_repository
        self.match_repository = match_repository
        self.item_repository = item_repository
        self.embedding_repository = embedding_repository
        self.notification_service = notification_service

    async def verify_claim_pair(
        self,
        *,
        user_id: int,
        lost_item_id: int,
        found_item_id: int,
    ) -> ClaimVerificationResponse:
        lost_item = await self.item_repository.get_by_id_for_user(
            lost_item_id,
            user_id,
        )

        if lost_item is None:
            raise HTTPException(
                status_code=404,
                detail="Lost item not found",
            )

        if lost_item.type != ItemType.LOST:
            raise HTTPException(
                status_code=400,
                detail="Selected item is not a lost item",
            )

        if lost_item.status != ItemStatus.ACTIVE:
            raise HTTPException(
                status_code=400,
                detail="Lost item is no longer active",
            )

        found_item = await self.item_repository.get_by_id(found_item_id)

        if found_item is None:
            raise HTTPException(
                status_code=404,
                detail="Found item not found",
            )

        if found_item.type != ItemType.FOUND:
            raise HTTPException(
                status_code=400,
                detail="Selected item is not a found item",
            )

        if found_item.status != ItemStatus.ACTIVE:
            raise HTTPException(
                status_code=400,
                detail="Found item is no longer available",
            )

        if found_item.user_id == user_id:
            raise HTTPException(
                status_code=403,
                detail="You cannot claim your own item",
            )

        lost_embedding = await self.embedding_repository.get_by_item_id(
            lost_item_id
        )
        found_embedding = await self.embedding_repository.get_by_item_id(
            found_item_id
        )

        if not lost_embedding or not found_embedding:
            raise HTTPException(
                status_code=409,
                detail="Item matching is not ready yet",
            )

        similarity = SimilarityService.cosine_similarity(
            lost_embedding.embedding,
            found_embedding.embedding,
        )

        if similarity <= CLAIM_SIMILARITY_THRESHOLD:
            raise HTTPException(
                status_code=403,
                detail=(
                    "This item is not sufficiently relevant to your lost item"
                ),
            )

        return ClaimVerificationResponse(
            valid=True,
            found_item_id=found_item_id,
            lost_item_id=lost_item_id,
            similarity_score=similarity,
        )

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

        # 2. Match must be confirmed or pending
        if match.status not in (MatchStatus.CONFIRMED, MatchStatus.PENDING):
            raise ValueError(
                "A claim cannot be created for a rejected match"
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

        # 6. Create the claim in an atomic transaction
        try:
            async with self.db.begin_nested():
                claim = await self.claim_repository.create(
                    match_id=match_id,
                    claimant_id=claimant_id,
                )
            await self.db.commit()
            await self.db.refresh(claim)
        except IntegrityError:
            await self.db.rollback()
            raise ValueError("A claim already exists for this match")

        # 7. Get the found item
        found_item = await self.item_repository.get_by_id(
            match.found_item_id
        )

        # 8. Notify the finder
        if found_item is not None:
            try:
                await self.notification_service.notify_claim_created(
                    user_id=found_item.user_id,
                    match_id=match.id,
                    claim_id=claim.id,
                )
            except Exception:
                pass

        # 9. Return the created claim
        return claim

    async def update_claim_status(
        self,
        *,
        claim_id: int,
        user_id: int,
        status: ClaimStatus,
    ) -> Claim:

        # 1. Get the claim
        claim = await self.claim_repository.get_by_id(claim_id)

        if claim is None:
            raise ValueError("Claim not found")

        # 2. Claim must still be pending
        if claim.status != ClaimStatus.PENDING:
            raise ValueError("Claim has already been decided")

        # 3. Get the match
        match = await self.match_repository.get_by_id(
            claim.match_id
        )

        if match is None:
            raise ValueError("Match not found")

        # 4. Match must not be rejected
        if match.status == MatchStatus.REJECTED:
            raise ValueError(
                "Claim cannot be decided for a rejected match"
            )

        # 5. Get the found item
        found_item = await self.item_repository.get_by_id(
            match.found_item_id
        )

        if found_item is None:
            raise ValueError("Found item not found")

        # 6. Only the finder can accept or reject the claim
        if found_item.user_id != user_id:
            raise PermissionError(
                "Only the finder can accept or reject this claim"
            )

        # 7. Reject claim
        if status == ClaimStatus.REJECTED:
            updated_claim = await self.claim_repository.reject_claim(
                claim_id=claim.id,
                match_id=match.id,
                lost_item_id=match.lost_item_id,
                found_item_id=match.found_item_id,
            )

            if updated_claim is None:
                raise ValueError("Claim has already been decided")

            # Notify the claimant
            try:
                await self.notification_service.notify_claim_rejected(
                    user_id=claim.claimant_id,
                    match_id=match.id,
                    claim_id=claim.id,
                )
            except Exception:
                pass

            return updated_claim

        # 8. Accept claim
        if status == ClaimStatus.ACCEPTED:
            updated_claim = await self.claim_repository.accept_claim(
                claim_id=claim.id,
                match_id=match.id,
                lost_item_id=match.lost_item_id,
                found_item_id=match.found_item_id,
            )

            if updated_claim is None:
                raise ValueError("Claim has already been decided")

            # Notify the claimant
            try:
                await self.notification_service.notify_claim_accepted(
                    user_id=claim.claimant_id,
                    match_id=match.id,
                    claim_id=claim.id,
                )
            except Exception:
                pass

            return updated_claim

        # 9. Invalid status
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

    async def create_manual_claim(
        self,
        *,
        user_id: int,
        lost_item_id: int,
        found_item_id: int,
    ) -> Claim:
        # 1. Verify LOST item ownership
        lost_item = await self.item_repository.get_by_id_for_user(
            lost_item_id,
            user_id,
        )

        if lost_item is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lost item not found",
            )

        # 2. Verify LOST item type and status
        if lost_item.type != ItemType.LOST:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected item is not a lost item",
            )

        if lost_item.status != ItemStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Lost item is no longer active",
            )

        # 3. Verify FOUND item
        found_item = await self.item_repository.get_by_id(
            found_item_id,
        )

        if found_item is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Found item not found",
            )

        if found_item.type != ItemType.FOUND:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected item is not a found item",
            )

        if found_item.status != ItemStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Found item is no longer available",
            )

        if found_item.user_id == user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot claim your own item",
            )

        # 4. Get embeddings
        lost_embedding = (
            await self.embedding_repository.get_by_item_id(
                lost_item_id
            )
        )

        found_embedding = (
            await self.embedding_repository.get_by_item_id(
                found_item_id
            )
        )

        if not lost_embedding or not found_embedding:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Item matching is not ready yet",
            )

        # 5. Calculate similarity and enforce threshold
        similarity = SimilarityService.cosine_similarity(
            lost_embedding.embedding,
            found_embedding.embedding,
        )

        if similarity <= CLAIM_SIMILARITY_THRESHOLD:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This item is not sufficiently relevant to your lost item",
            )

        # 6. Wrap Match check/create + Claim check/create in a single DB transaction
        try:
            async with self.db.begin_nested():
                match = await self.match_repository.get_existing_match(
                    lost_item_id=lost_item_id,
                    found_item_id=found_item_id,
                )

                if match is None:
                    match = await self.match_repository.create(
                        lost_item_id=lost_item_id,
                        found_item_id=found_item_id,
                        similarity_score=similarity,
                    )
                elif match.status == MatchStatus.REJECTED:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="This match is no longer available for a claim",
                    )

                # Prevent duplicate claim on this match
                existing_claim = (
                    await self.claim_repository.get_by_match(
                        match.id
                    )
                )

                if existing_claim is not None:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="A claim already exists for this match",
                    )

                # Create the claim
                claim = await self.claim_repository.create(
                    match_id=match.id,
                    claimant_id=user_id,
                )

            await self.db.commit()
            await self.db.refresh(claim)
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A claim already exists for this match",
            )


        # 7. Notify the finder (owner of the FOUND item) outside transaction
        try:
            await self.notification_service.notify_claim_created(
                user_id=found_item.user_id,
                match_id=match.id,
                claim_id=claim.id,
            )
        except Exception:
            pass

        return claim
