"""Item location reporting tests (map pin / live location flow).

The report form sends optional latitude/longitude with POST /items.
Covers: coordinates persist, PostGIS geog auto-populates from them,
missing coordinates leave geog NULL, out-of-range values are rejected
at the schema layer (422).
"""

import uuid

import pytest
from pydantic import ValidationError
from sqlalchemy import delete, text

from app.db.database import AsyncSessionLocal
from app.models.item import Item
from app.models.item_embedding import ItemEmbedding
from app.models.item_image import ItemImage
from app.models.match import Match
from app.models.notification import Notification
from app.models.user import User
from app.repositories.item_repository import ItemRepository
from app.schemas.item import CreateItemRequest
from app.services.item_service import ItemService


class NoStorage:
    def head_object(self, *, object_key):
        raise AssertionError("no images expected in this test")


async def _make_user(session, uid):
    user = User(
        name=f"Reporter_{uid}", email=f"reporter_{uid}@example.com",
        google_id=f"g_{uid}_r",
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest.mark.asyncio
async def test_coordinates_persist_and_populate_geog():
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        user = await _make_user(session, uid)
        user_id = user.id
        svc = ItemService(ItemRepository(session), NoStorage())

        pinned = await svc.create_item(
            user_id=user_id,
            data=CreateItemRequest(
                type="LOST", title="Lost keys",
                description="silver house keys", category="Keys",
                latitude=31.5204, longitude=74.3587,
            ),
        )
        unpinned = await svc.create_item(
            user_id=user_id,
            data=CreateItemRequest(
                type="FOUND", title="Found keys",
                description="silver keys found", category="Keys",
            ),
        )
        item_ids = [pinned.id, unpinned.id]

        assert pinned.latitude == pytest.approx(31.5204)
        assert pinned.longitude == pytest.approx(74.3587)
        assert unpinned.latitude is None

        geog = (await session.execute(
            text("SELECT ST_AsText(geog::geometry) FROM items "
                 "WHERE id = :id"),
            {"id": pinned.id},
        )).scalar_one()
        assert geog == "POINT(74.3587 31.5204)"

        geog_none = (await session.execute(
            text("SELECT geog FROM items WHERE id = :id"),
            {"id": unpinned.id},
        )).scalar_one()
        assert geog_none is None

    async with AsyncSessionLocal() as session:
        await session.execute(
            delete(Notification).where(Notification.user_id == user_id))
        await session.execute(
            delete(Match).where(
                (Match.lost_item_id.in_(item_ids))
                | (Match.found_item_id.in_(item_ids))))
        await session.execute(
            delete(ItemImage).where(ItemImage.item_id.in_(item_ids)))
        await session.execute(
            delete(ItemEmbedding).where(
                ItemEmbedding.item_id.in_(item_ids)))
        await session.execute(delete(Item).where(Item.id.in_(item_ids)))
        await session.execute(delete(User).where(User.id == user_id))
        await session.commit()


@pytest.mark.asyncio
async def test_occurred_at_persists_when_given():
    """Stitch screen 3: optional date/time survives creation."""
    import datetime

    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        user = await _make_user(session, uid)
        user_id = user.id
        svc = ItemService(ItemRepository(session), NoStorage())

        when = datetime.datetime(
            2026, 9, 20, 13, 30, tzinfo=datetime.timezone.utc
        )
        item = await svc.create_item(
            user_id=user_id,
            data=CreateItemRequest(
                type="LOST", title="Lost watch",
                description="silver wrist watch", category="Accessories",
                occurred_at=when,
            ),
        )
        assert item.occurred_at is not None
        assert item.occurred_at.isoformat().startswith("2026-09-20T13:30")
        item_ids = [item.id]

        # Stitch screen 6: ItemResponse carries created_at for
        # "reported Xm ago" labels.
        from app.schemas.item import ItemResponse

        assert ItemResponse.model_validate(item).created_at is not None

    async with AsyncSessionLocal() as session:
        await session.execute(
            delete(Notification).where(Notification.user_id == user_id))
        await session.execute(
            delete(Match).where(
                (Match.lost_item_id.in_(item_ids))
                | (Match.found_item_id.in_(item_ids))))
        await session.execute(
            delete(ItemImage).where(ItemImage.item_id.in_(item_ids)))
        await session.execute(
            delete(ItemEmbedding).where(
                ItemEmbedding.item_id.in_(item_ids)))
        await session.execute(delete(Item).where(Item.id.in_(item_ids)))
        await session.execute(delete(User).where(User.id == user_id))
        await session.commit()


def test_out_of_range_coordinates_rejected():
    with pytest.raises(ValidationError):
        CreateItemRequest(
            type="LOST", title="Lost keys", description="silver keys",
            category="Keys", latitude=100.0, longitude=74.0,
        )
    with pytest.raises(ValidationError):
        CreateItemRequest(
            type="LOST", title="Lost keys", description="silver keys",
            category="Keys", latitude=31.0, longitude=200.0,
        )
