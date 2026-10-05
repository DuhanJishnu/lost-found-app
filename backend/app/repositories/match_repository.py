from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.models.match import Match, MatchStatus
from app.models.item import Item, ItemStatus


class MatchRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        *,
        lost_item_id: int,
        found_item_id: int,
        similarity_score: float,
    ) -> Match:
        match = Match(
            lost_item_id=lost_item_id,
            found_item_id=found_item_id,
            similarity_score=similarity_score,
            status=MatchStatus.PENDING,
        )

        self.db.add(match)

        await self.db.flush()

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

    async def get_for_user(
        self,
        user_id: int,
    ) -> list[Match]:
        lost_item = aliased(Item)
        found_item = aliased(Item)

        result = await self.db.execute(
            select(Match)
            .join(
                lost_item,
                lost_item.id == Match.lost_item_id,
            )
            .join(
                found_item,
                found_item.id == Match.found_item_id,
            )
            .where(
                (lost_item.user_id == user_id)
                | (found_item.user_id == user_id)
            )
            .order_by(Match.created_at.desc())
        )

        return list(result.scalars().all())

    async def get_by_id_for_user(
        self,
        match_id: int,
        user_id: int,
    ) -> Match | None:
        lost_item = aliased(Item)
        found_item = aliased(Item)

        result = await self.db.execute(
            select(Match)
            .join(
                lost_item,
                lost_item.id == Match.lost_item_id,
            )
            .join(
                found_item,
                found_item.id == Match.found_item_id,
            )
            .where(
                Match.id == match_id,
                (
                    (lost_item.user_id == user_id)
                    | (found_item.user_id == user_id)
                ),
            )
        )

        return result.scalar_one_or_none()

    async def update_status(
        self,
        match_id: int,
        status: MatchStatus,
    ) -> Match | None:
        result = await self.db.execute(
            update(Match)
            .where(
                Match.id == match_id,
                Match.status == MatchStatus.PENDING,
            )
            .values(status=status)
            .returning(Match)
        )

        updated_match = result.scalar_one_or_none()
        if updated_match is None:
            return None

        await self.db.commit()
        await self.db.refresh(updated_match)

        return updated_match


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

    async def confirm_match(
        self,
        *,
        match_id: int,
        lost_item_id: int,
        found_item_id: int,
    ) -> Match | None:

        result = await self.db.execute(
            update(Match)
            .where(
                Match.id == match_id,
                Match.status == MatchStatus.PENDING,
            )
            .values(
                status=MatchStatus.CONFIRMED,
            )
            .returning(Match)
        )

        match = result.scalar_one_or_none()

        if match is None:
            return None

        await self.db.execute(
            update(Item)
            .where(
                Item.id.in_([
                    lost_item_id,
                    found_item_id,
                ]),
                Item.status == ItemStatus.ACTIVE,
            )
            .values(status=ItemStatus.MATCHED)
        )

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

        await self.db.commit()

        return match