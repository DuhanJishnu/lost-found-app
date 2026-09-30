from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.models.claim import Claim, ClaimStatus
from app.models.item import Item, ItemStatus
from app.models.match import Match

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

        await self.db.commit()
        await self.db.refresh(claim)

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
        claim: Claim,
        status: ClaimStatus,
    ) -> Claim:
        claim.status = status

        await self.db.commit()
        await self.db.refresh(claim)

        return claim

    async def accept_claim(
        self,
        *,
        claim: Claim,
        lost_item_id: int,
        found_item_id: int,
    ) -> Claim:

        claim.status = ClaimStatus.ACCEPTED

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

        await self.db.commit()
        await self.db.refresh(claim)

        return claim

    async def reject_claim(
        self,
        *,
        claim: Claim,
        lost_item_id: int,
        found_item_id: int,
    ) -> Claim:

        claim.status = ClaimStatus.REJECTED

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

        await self.db.commit()
        await self.db.refresh(claim)

        return claim