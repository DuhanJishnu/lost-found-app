from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.claim import Claim, ClaimStatus


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