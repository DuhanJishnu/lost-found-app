from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, func, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from enum import Enum


class MatchStatus(str, Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    REJECTED = "REJECTED"

class Match(Base):
    __tablename__ = "matches"

    id: Mapped[int] = mapped_column(
        primary_key=True,
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

    similarity_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    status: Mapped[MatchStatus] = mapped_column(
        SQLEnum(MatchStatus),
        default=MatchStatus.PENDING,
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )