from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.item_image import ItemImage

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.item_embedding import ItemEmbedding

class ItemType(str, Enum):
    LOST = "LOST"
    FOUND = "FOUND"


class ItemStatus(str, Enum):
    ACTIVE = "ACTIVE"
    MATCHED = "MATCHED"
    CLOSED = "CLOSED"


class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    type: Mapped[ItemType] = mapped_column(
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    category: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    images: Mapped[list["ItemImage"]] = relationship(
        "ItemImage",
        back_populates="item",
        cascade="all, delete-orphan",
    )

    embedding: Mapped["ItemEmbedding | None"] = relationship(
        "ItemEmbedding",
        back_populates="item",
        uselist=False,
        cascade="all, delete-orphan",
    )

    latitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    longitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    status: Mapped[ItemStatus] = mapped_column(
        default=ItemStatus.ACTIVE,
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )