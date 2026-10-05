from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.claim_answer import ClaimAnswer
from app.models.claim_question import ClaimQuestion


class ClaimVerificationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_active_questions(self) -> list[ClaimQuestion]:
        result = await self.db.execute(
            select(ClaimQuestion)
            .where(ClaimQuestion.is_active == True)  # noqa: E712
            .order_by(ClaimQuestion.id)
        )

        return list(result.scalars().all())

    async def get_active_question(
        self,
        question_id: int,
    ) -> ClaimQuestion | None:
        result = await self.db.execute(
            select(ClaimQuestion).where(
                ClaimQuestion.id == question_id,
                ClaimQuestion.is_active == True,  # noqa: E712
            )
        )

        return result.scalar_one_or_none()

    async def upsert_pending_answer(
        self,
        *,
        claimant_id: int,
        lost_item_id: int,
        found_item_id: int,
        question_id: int,
        answer_hash: str,
    ) -> ClaimAnswer:
        result = await self.db.execute(
            select(ClaimAnswer).where(
                ClaimAnswer.claimant_id == claimant_id,
                ClaimAnswer.lost_item_id == lost_item_id,
                ClaimAnswer.found_item_id == found_item_id,
                ClaimAnswer.question_id == question_id,
                ClaimAnswer.claim_id.is_(None),
            )
        )

        existing = result.scalar_one_or_none()

        if existing is not None:
            existing.answer_hash = answer_hash
            await self.db.flush()
            return existing

        answer = ClaimAnswer(
            claimant_id=claimant_id,
            lost_item_id=lost_item_id,
            found_item_id=found_item_id,
            question_id=question_id,
            answer_hash=answer_hash,
        )
        self.db.add(answer)
        await self.db.flush()

        return answer

    async def link_pending_answers_to_claim(
        self,
        *,
        claimant_id: int,
        lost_item_id: int,
        found_item_id: int,
        claim_id: int,
    ) -> None:
        await self.db.execute(
            update(ClaimAnswer)
            .where(
                ClaimAnswer.claimant_id == claimant_id,
                ClaimAnswer.lost_item_id == lost_item_id,
                ClaimAnswer.found_item_id == found_item_id,
                ClaimAnswer.claim_id.is_(None),
            )
            .values(claim_id=claim_id)
        )
        await self.db.flush()
