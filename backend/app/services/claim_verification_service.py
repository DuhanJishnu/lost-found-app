import hashlib
import re
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.repositories.claim_verification_repository import (
    ClaimVerificationRepository,
)
from app.repositories.item_repository import ItemRepository
from app.schemas.claim import (
    ClaimQuestionResponse,
    SubmitClaimAnswersResponse,
)

# Fraction of answers that must be grounded in the LOST report.
PASS_THRESHOLD = 0.60

# How long a passing result unlocks POST /claims/ for the pair.
TOKEN_TTL_MINUTES = 15

TOKEN_TYPE = "claim_verification"

STOPWORDS = frozenset({
    "the", "a", "an", "and", "or", "of", "to", "in", "on", "at",
    "for", "with", "from", "by", "is", "are", "was", "were",
    "near", "my", "it", "its", "this", "that", "i", "had", "has",
})

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def normalize_answer(answer: str) -> str:
    return re.sub(r"\s+", " ", answer.strip().casefold())


def content_tokens(text: str) -> set[str]:
    return {
        token
        for token in _TOKEN_RE.findall(text.casefold())
        if len(token) >= 3 and token not in STOPWORDS
    }


def hash_answer(normalized: str) -> str:
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


class ClaimVerificationService:
    """Ownership questionnaire (Phase 8).

    Automated check, honestly scoped: an answer scores as grounded when
    it shares a content token with the claimant's own LOST report
    (title + description + category). This commits the claimant to
    specifics from their report — details a stranger viewing the FOUND
    photo cannot reliably reproduce — and creates a hash-only audit
    trail. It is NOT proof of ownership; the finder's accept/reject
    review remains decisive.
    """

    def __init__(
        self,
        db: AsyncSession,
        repository: ClaimVerificationRepository,
        item_repository: ItemRepository,
        claim_service,
    ):
        self.db = db
        self.repository = repository
        self.item_repository = item_repository
        # ClaimService validates the (lost, found) pair (ownership, item
        # types/statuses, 40% similarity) before any questionnaire step.
        self.claim_service = claim_service
        self.settings = get_settings()

    async def get_questions(
        self,
        *,
        user_id: int,
        lost_item_id: int,
        found_item_id: int,
    ) -> list[ClaimQuestionResponse]:
        await self.claim_service.verify_claim_pair(
            user_id=user_id,
            lost_item_id=lost_item_id,
            found_item_id=found_item_id,
        )

        questions = await self.repository.list_active_questions()

        return [
            ClaimQuestionResponse.model_validate(q) for q in questions
        ]

    async def submit_answers(
        self,
        *,
        user_id: int,
        lost_item_id: int,
        found_item_id: int,
        answers: list[dict],
    ) -> SubmitClaimAnswersResponse:
        verification = await self.claim_service.verify_claim_pair(
            user_id=user_id,
            lost_item_id=lost_item_id,
            found_item_id=found_item_id,
        )

        if not answers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one answer is required.",
            )

        seen: set[int] = set()

        for entry in answers:
            question_id = entry["question_id"]
            raw = entry["answer"]

            if question_id in seen:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Duplicate answer for question {question_id}.",
                )
            seen.add(question_id)

            question = await self.repository.get_active_question(
                question_id
            )

            if question is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unknown question {question_id}.",
                )

            normalized = normalize_answer(raw)

            if not normalized:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Answers must not be empty.",
                )

            await self.repository.upsert_pending_answer(
                claimant_id=user_id,
                lost_item_id=lost_item_id,
                found_item_id=found_item_id,
                question_id=question_id,
                answer_hash=hash_answer(normalized),
            )

        lost_item = await self.item_repository.get_by_id(lost_item_id)

        report_tokens = content_tokens(
            f"{lost_item.title} {lost_item.description} "
            f"{lost_item.category}"
        )

        grounded = 0

        for entry in answers:
            if content_tokens(entry["answer"]) & report_tokens:
                grounded += 1

        score = grounded / len(answers)
        passed = score >= PASS_THRESHOLD

        await self.db.commit()

        token = None

        if passed:
            token = self._issue_token(
                user_id=user_id,
                lost_item_id=lost_item_id,
                found_item_id=found_item_id,
                score=score,
            )

        return SubmitClaimAnswersResponse(
            passed=passed,
            score=score,
            verification_token=token,
            found_item_id=verification.found_item_id,
            lost_item_id=verification.lost_item_id,
        )

    def verify_token(
        self,
        *,
        token: str,
        user_id: int,
        lost_item_id: int,
        found_item_id: int,
    ) -> None:
        """Raise HTTPException 403 unless the token unlocks this pair."""
        try:
            payload = jwt.decode(
                token,
                self.settings.auth_secret,
                algorithms=["HS256"],
            )
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Ownership verification has expired. "
                "Please answer the questions again.",
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid ownership verification. "
                "Please answer the questions again.",
            )

        if (
            payload.get("type") != TOKEN_TYPE
            or payload.get("user_id") != user_id
            or payload.get("lost_item_id") != lost_item_id
            or payload.get("found_item_id") != found_item_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Ownership verification does not match this claim. "
                "Please answer the questions again.",
            )

    def _issue_token(
        self,
        *,
        user_id: int,
        lost_item_id: int,
        found_item_id: int,
        score: float,
    ) -> str:
        now = datetime.now(timezone.utc)

        return jwt.encode(
            {
                "type": TOKEN_TYPE,
                "user_id": user_id,
                "lost_item_id": lost_item_id,
                "found_item_id": found_item_id,
                "score": score,
                "iat": now,
                "exp": now + timedelta(minutes=TOKEN_TTL_MINUTES),
            },
            self.settings.auth_secret,
            algorithm="HS256",
        )
