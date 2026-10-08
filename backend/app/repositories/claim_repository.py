from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.models.claim import Claim, ClaimStatus
from app.models.item import Item, ItemStatus
from app.models.match import Match, MatchStatus

class ClaimRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        *,
        match_id: int,
        claimant_id: int,
    ) -> Claim:
        claim = Claim(
            match_id=match_id,
            claimant_id=claimant_id,
            status=ClaimStatus.PENDING,
        )

        self.db.add(claim)

        await self.db.flush()

        return claim

    async def get_by_id(
        self,
        claim_id: int,
    ) -> Claim | None:
        result = await self.db.execute(
            select(Claim).where(
                Claim.id == claim_id
            )
        )

        return result.scalar_one_or_none()

    async def get_for_user(
        self,
        user_id: int,
    ) -> list[Claim]:
        lost_item = aliased(Item)
        found_item = aliased(Item)

        result = await self.db.execute(
            select(Claim)
            .join(Match, Match.id == Claim.match_id)
            .join(
                lost_item,
                lost_item.id == Match.lost_item_id,
            )
            .join(
                found_item,
                found_item.id == Match.found_item_id,
            )
            .where(
                (Claim.claimant_id == user_id)
                | (lost_item.user_id == user_id)
                | (found_item.user_id == user_id)
            )
            .order_by(Claim.created_at.desc())
        )

        return list(result.scalars().all())

    async def get_by_id_for_user(
        self,
        claim_id: int,
        user_id: int,
    ) -> Claim | None:
        lost_item = aliased(Item)
        found_item = aliased(Item)

        result = await self.db.execute(
            select(Claim)
            .join(Match, Match.id == Claim.match_id)
            .join(
                lost_item,
                lost_item.id == Match.lost_item_id,
            )
            .join(
                found_item,
                found_item.id == Match.found_item_id,
            )
            .where(
                Claim.id == claim_id,
                (
                    (Claim.claimant_id == user_id)
                    | (lost_item.user_id == user_id)
                    | (found_item.user_id == user_id)
                ),
            )
        )

        return result.scalar_one_or_none()

    async def get_by_match(
        self,
        match_id: int,
    ) -> Claim | None:
        result = await self.db.execute(
            select(Claim).where(
                Claim.match_id == match_id
            )
        )

        return result.scalar_one_or_none()

    async def get_for_claimant(
        self,
        claimant_id: int,
    ) -> list[Claim]:
        result = await self.db.execute(
            select(Claim)
            .where(
                Claim.claimant_id == claimant_id
            )
            .order_by(Claim.created_at.desc())
        )

        return list(result.scalars().all())

    async def update_status(
        self,
        claim_id: int,
        status: ClaimStatus,
    ) -> Claim | None:

        result = await self.db.execute(
            update(Claim)
            .where(
                Claim.id == claim_id,
                Claim.status == ClaimStatus.PENDING,
            )
            .values(status=status)
            .returning(Claim)
        )

        updated_claim = result.scalar_one_or_none()

        if updated_claim is None:
            return None

        await self.db.commit()
        return updated_claim

    async def accept_claim(
        self,
        *,
        claim_id: int,
        match_id: int,
        lost_item_id: int,
        found_item_id: int,
    ) -> Claim | None:

        result = await self.db.execute(
            update(Claim)
            .where(
                Claim.id == claim_id,
                Claim.status == ClaimStatus.PENDING,
            )
            .values(status=ClaimStatus.ACCEPTED)
            .returning(Claim)
        )

        updated_claim = result.scalar_one_or_none()

        if updated_claim is None:
            return None

        # Confirm the match if it was pending
        await self.db.execute(
            update(Match)
            .where(
                Match.id == match_id,
                Match.status == MatchStatus.PENDING,
            )
            .values(status=MatchStatus.CONFIRMED)
        )

        # Close both items
        await self.db.execute(
            update(Item)
            .where(
                Item.id.in_([
                    lost_item_id,
                    found_item_id,
                ])
            )
            .values(status=ItemStatus.CLOSED)
        )

        # Reject any other pending matches involving these items
        await self.db.execute(
            update(Match)
            .where(
                Match.id != match_id,
                Match.status == MatchStatus.PENDING,
                (
                    (Match.lost_item_id == lost_item_id)
                    | (Match.found_item_id == found_item_id)
                ),
            )
            .values(status=MatchStatus.REJECTED)
        )

        # Phase 9.5: flush only — the service stages the notification
        # next and commits everything atomically.
        await self.db.flush()
        await self.db.refresh(updated_claim)

        return updated_claim

    async def reject_claim(
        self,
        *,
        claim_id: int,
        match_id: int,
        lost_item_id: int,
        found_item_id: int,
    ) -> Claim | None:

        result = await self.db.execute(
            update(Claim)
            .where(
                Claim.id == claim_id,
                Claim.status == ClaimStatus.PENDING,
            )
            .values(status=ClaimStatus.REJECTED)
            .returning(Claim)
        )

        updated_claim = result.scalar_one_or_none()

        if updated_claim is None:
            return None

        # Return items to ACTIVE if they were MATCHED
        await self.db.execute(
            update(Item)
            .where(
                Item.id.in_([
                    lost_item_id,
                    found_item_id,
                ]),
                Item.status == ItemStatus.MATCHED,
            )
            .values(status=ItemStatus.ACTIVE)
        )

        # Phase 9.5: flush only — the service stages the notification
        # next and commits everything atomically.
        await self.db.flush()
        await self.db.refresh(updated_claim)

        return updated_claim