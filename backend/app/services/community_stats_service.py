from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.claim import Claim, ClaimStatus
from app.models.item import Item, ItemType
from app.models.user import User
from app.schemas.stats import CommunityStatsResponse


class CommunityStatsService:
    """Network-wide counters backing the dashboard analytics."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_stats(self) -> CommunityStatsResponse:
        total_users = await self.db.scalar(
            select(func.count()).select_from(User)
        )

        items_lost = await self.db.scalar(
            select(func.count())
            .select_from(Item)
            .where(Item.type == ItemType.LOST)
        )

        items_found = await self.db.scalar(
            select(func.count())
            .select_from(Item)
            .where(Item.type == ItemType.FOUND)
        )

        successful_returns = await self.db.scalar(
            select(func.count())
            .select_from(Claim)
            .where(Claim.status == ClaimStatus.ACCEPTED)
        )

        return CommunityStatsResponse(
            total_users=total_users or 0,
            items_lost=items_lost or 0,
            items_found=items_found or 0,
            successful_returns=successful_returns or 0,
        )
