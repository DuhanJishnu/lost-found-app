"""Phase 7 + Phase 10: geospatial FOUND feed tests.

Covers implementation_plan.md Phase 7:
  7.1 PostGIS enabled (migration applied; ST_DWithin works)
  7.2 geography column auto-derived from lat/lon (NULL when unset)
  7.3 radius filter keeps nearby, drops far and location-less items
  7.4 ?latitude=&longitude=&radius_km= params; lat/lon required together
  7.5 distance_km populated when filtering, None otherwise

Follows the existing tests/ pattern: real DB via AsyncSessionLocal,
uuid-isolated rows, cleanup in finally.
"""

import uuid

import httpx
import pytest
from sqlalchemy import delete

from app.db.database import AsyncSessionLocal
from app.main import app
from app.models.item import Item, ItemStatus, ItemType
from app.models.item_embedding import ItemEmbedding
from app.models.item_image import ItemImage
from app.models.match import Match
from app.models.notification import Notification
from app.models.user import User
from app.services.auth_service import AuthService
from app.services.found_feed_service import FoundFeedService

DIM = 768

# Reference point for the tests (near Lahore).
REF_LAT, REF_LON = 31.53, 74.37
# ~1.5 km from the reference point.
NEAR_LAT, NEAR_LON = 31.5204, 74.3587
# Karachi, ~1000 km away.
FAR_LAT, FAR_LON = 24.8607, 67.0011


def _unit(idx):
    v = [0.0] * DIM
    v[idx] = 1.0
    return v


def _token(user_id):
    return AuthService().create_api_token(user_id)


def _client(token=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
        headers=headers,
    )


async def _setup(session, uid):
    owner = User(
        name=f"Owner_{uid}", email=f"owner_{uid}@example.com",
        google_id=f"g_{uid}_o",
    )
    finder = User(
        name=f"Finder_{uid}", email=f"finder_{uid}@example.com",
        google_id=f"g_{uid}_f",
    )
    session.add_all([owner, finder])
    await session.commit()
    await session.refresh(owner)
    await session.refresh(finder)

    async def add_item(user_id, type, title, lat=None, lon=None):
        item = Item(
            user_id=user_id, type=type, title=title,
            description=f"{title} description",
            category="Electronics", status=ItemStatus.ACTIVE,
            latitude=lat, longitude=lon,
        )
        session.add(item)
        await session.commit()
        await session.refresh(item)
        session.add(ItemEmbedding(
            item_id=item.id, embedding=_unit(0), model="t"))
        await session.commit()
        return item

    lost = await add_item(owner.id, ItemType.LOST, f"Lost {uid}")
    near = await add_item(
        finder.id, ItemType.FOUND, f"Near {uid}", NEAR_LAT, NEAR_LON)
    far = await add_item(
        finder.id, ItemType.FOUND, f"Far {uid}", FAR_LAT, FAR_LON)
    noloc = await add_item(finder.id, ItemType.FOUND, f"NoLoc {uid}")
    return owner, finder, lost, near, far, noloc


async def _cleanup(session, user_ids, item_ids):
    await session.execute(
        delete(Notification).where(Notification.user_id.in_(user_ids))
    )
    await session.execute(
        delete(Match).where(
            (Match.lost_item_id.in_(item_ids))
            | (Match.found_item_id.in_(item_ids))
        )
    )
    await session.execute(
        delete(ItemImage).where(ItemImage.item_id.in_(item_ids))
    )
    await session.execute(
        delete(ItemEmbedding).where(ItemEmbedding.item_id.in_(item_ids))
    )
    await session.execute(delete(Item).where(Item.id.in_(item_ids)))
    await session.execute(delete(User).where(User.id.in_(user_ids)))
    await session.commit()


@pytest.mark.asyncio
async def test_radius_filter_and_distance():
    """7.3/7.5: nearby kept with distance_km; far and loc-less dropped."""
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        owner, finder, lost, near, far, noloc = await _setup(session, uid)
        ids = {
            "users": [owner.id, finder.id],
            "items": [lost.id, near.id, far.id, noloc.id],
        }

    try:
        async with AsyncSessionLocal() as session:
            svc = FoundFeedService(session)
            # No location: all three FOUND items, no distances.
            plain = await svc.get_feed(owner.id, search=uid)
            assert {f.id for f in plain} == {near.id, far.id, noloc.id}
            assert all(f.distance_km is None for f in plain)

            # 50 km radius: only the nearby item, with distance.
            local = await svc.get_feed(
                owner.id, search=uid,
                latitude=REF_LAT, longitude=REF_LON, radius_km=50,
            )
            assert [f.id for f in local] == [near.id]
            assert local[0].distance_km == pytest.approx(1.5, abs=0.5)

            # 1500 km radius: near + far, still not the location-less one.
            wide = await svc.get_feed(
                owner.id, search=uid,
                latitude=REF_LAT, longitude=REF_LON, radius_km=1500,
            )
            assert {f.id for f in wide} == {near.id, far.id}
            by_id = {f.id: f for f in wide}
            assert by_id[near.id].distance_km == pytest.approx(1.5, abs=0.5)
            assert by_id[far.id].distance_km > 900
    finally:
        async with AsyncSessionLocal() as session:
            await _cleanup(session, ids["users"], ids["items"])


@pytest.mark.asyncio
async def test_location_params_validated_together():
    """7.4: latitude without longitude is a 400."""
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        owner, finder, *_ = await _setup(session, uid)
        ids = {
            "users": [owner.id, finder.id],
            "items": [],
        }
        # Collect item ids for cleanup.
        from sqlalchemy import select
        rows = await session.execute(
            select(Item.id).where(Item.title.ilike(f"%{uid}%")))
        ids["items"] = list(rows.scalars().all())

    try:
        async with _client(_token(ids["users"][0])) as client:
            r = await client.get(
                "/items/found/feed", params={"latitude": 31.5})
            assert r.status_code == 400

            r = await client.get("/items/found/feed", params={
                "latitude": REF_LAT, "longitude": REF_LON,
                "radius_km": 50, "q": uid,
            })
            assert r.status_code == 200
            body = r.json()
            assert all("distance_km" in f for f in body)
    finally:
        async with AsyncSessionLocal() as session:
            await _cleanup(session, ids["users"], ids["items"])
