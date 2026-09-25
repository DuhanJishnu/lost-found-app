from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.match import Match


class MatchRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        lost_item_id: int,
        found_item_id: int,
        similarity_score: float,
    ):
        match = Match(
            lost_item_id=lost_item_id,
            found_item_id=found_item_id,
            similarity_score=similarity_score,
        )

        self.db.add(match)
        await self.db.commit()
        await self.db.refresh(match)

        return match

    async def get_existing_match(
        self,
        lost_item_id: int,
        found_item_id: int,
    ):
        result = await self.db.execute(
            select(Match).where(
                Match.lost_item_id == lost_item_id,
                Match.found_item_id == found_item_id,
            )
        )

        return result.scalar_one_or_none()