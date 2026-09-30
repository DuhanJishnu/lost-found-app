from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.match import Match, MatchStatus


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

    async def get_by_id(
        self,
        match_id: int,
    ):
        result = await self.db.execute(
            select(Match).where(
                Match.id == match_id
            )
        )

        return result.scalar_one_or_none()

    async def update_status(
        self,
        match: Match,
        status: MatchStatus,
    ):
        match.status = status

        await self.db.commit()
        await self.db.refresh(match)

        return match

    async def reject_other_matches(
        self,
        lost_item_id: int,
        found_item_id: int,
        confirmed_match_id: int,
    ) -> None:
        await self.db.execute(
            update(Match)
            .where(
                Match.id != confirmed_match_id,
                Match.status == MatchStatus.PENDING,
                (
                    (Match.lost_item_id == lost_item_id)
                    | (Match.found_item_id == found_item_id)
                ),
            )
            .values(status=MatchStatus.REJECTED)
        )

        await self.db.commit()