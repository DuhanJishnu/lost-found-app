from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class QuestionCategory(str, Enum):
    COLOR = "COLOR"
    MARK = "MARK"
    LOCATION = "LOCATION"
    CONTENTS = "CONTENTS"
    BRAND = "BRAND"
    MODEL = "MODEL"
    PERSONALIZATION = "PERSONALIZATION"


class ClaimQuestion(Base):
    __tablename__ = "claim_questions"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    category: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        unique=True,
        index=True,
    )

    question: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
