from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ClaimAnswer(Base):
    """A claimant's hashed answer to one verification question.

    Plain-text answers are NEVER stored — only SHA-256 hashes of the
    normalized answer. claim_id is NULL until the questionnaire passes
    and the claim is created, at which point pending answers for the
    pair are linked for audit.
    """

    __tablename__ = "claim_answers"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    claimant_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    lost_item_id: Mapped[int] = mapped_column(
        ForeignKey("items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    found_item_id: Mapped[int] = mapped_column(
        ForeignKey("items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    question_id: Mapped[int] = mapped_column(
        ForeignKey("claim_questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    answer_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )

    claim_id: Mapped[int | None] = mapped_column(
        ForeignKey("claims.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
