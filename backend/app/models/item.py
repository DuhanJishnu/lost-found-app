from datetime import datetime
from enum import Enum

from geoalchemy2 import Geography, WKBElement
from sqlalchemy import Computed, DateTime, Float, ForeignKey, String, Text, func
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

    # Phase 7: PostGIS geography derived from lat/lon. GENERATED ALWAYS
    # STORED in Postgres, so it is always in sync and never INSERTed by
    # the ORM (Computed without persist_select keeps it out of writes).
    geog: Mapped[WKBElement | None] = mapped_column(
        Geography(geometry_type="POINT", srid=4326),
        Computed(
            "CASE WHEN latitude IS NULL OR longitude IS NULL THEN NULL "
            "ELSE ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)"
            "::geography END",
            persisted=True,
        ),
        nullable=True,
    )

    status: Mapped[ItemStatus] = mapped_column(
        default=ItemStatus.ACTIVE,
        nullable=False,
        index=True,
    )

    # Stitch screen 3: when the item was lost/found, if the reporter
    # gave a date. Optional — never blocks creation or matching.
    occurred_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
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