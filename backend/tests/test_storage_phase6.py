"""Phase 6 + Phase 10: Storage authorization tests.

Covers implementation_plan.md Phase 6:
  6.1 download-url checks ItemImage -> Item -> user_id ownership
  6.2 feed payloads never contain raw R2 object keys
  6.3 upload-url + embeddings routes gated (no anonymous minting,
      no cross-user enumeration)
  6.4 signed-URL TTL is a single documented constant (300s)

Router tests use httpx ASGITransport against the real app + dev DB.
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
from app.services.storage_service import StorageService

DIM = 768


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
    stranger = User(
        name=f"Stranger_{uid}", email=f"stranger_{uid}@example.com",
        google_id=f"g_{uid}_s",
    )
    session.add_all([owner, stranger])
    await session.commit()
    await session.refresh(owner)
    await session.refresh(stranger)

    item = Item(
        user_id=owner.id, type=ItemType.LOST,
        title=f"Owner lost {uid}", description="lost camera",
        category="Electronics", status=ItemStatus.ACTIVE,
    )
    found = Item(
        user_id=stranger.id, type=ItemType.FOUND,
        title=f"Stranger found {uid}", description="found camera",
        category="Electronics", status=ItemStatus.ACTIVE,
    )
    session.add_all([item, found])
    await session.commit()
    await session.refresh(item)
    await session.refresh(found)

    session.add(ItemImage(
        item_id=item.id, object_key=f"test/{item.id}.jpg",
        content_type="image/jpeg",
    ))
    session.add_all([
        ItemEmbedding(item_id=item.id, embedding=_unit(0), model="t"),
        ItemEmbedding(item_id=found.id, embedding=_unit(0), model="t"),
    ])
    await session.commit()
    return owner, stranger, item, found


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
async def test_download_url_enforces_ownership():
    """6.1: owner gets a URL; stranger gets 404; anonymous gets 401/403."""
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        owner, stranger, item, found = await _setup(session, uid)
        key = f"test/{item.id}.jpg"
        ids = {
            "users": [owner.id, stranger.id],
            "items": [item.id, found.id],
        }

    try:
        payload = {"object_key": key}
        async with _client() as client:
            r = await client.post("/storage/download-url", json=payload)
            assert r.status_code in (401, 403)

        async with _client(_token(ids["users"][1])) as client:
            r = await client.post("/storage/download-url", json=payload)
            # Indistinguishable from "missing": no ownership oracle.
            assert r.status_code == 404

        async with _client(_token(ids["users"][0])) as client:
            r = await client.post("/storage/download-url", json=payload)
            assert r.status_code == 200
            assert r.json()["download_url"].startswith("http")
    finally:
        async with AsyncSessionLocal() as session:
            await _cleanup(session, ids["users"], ids["items"])


@pytest.mark.asyncio
async def test_upload_url_requires_auth_and_image_mime():
    """6.3: anonymous minting blocked; non-image MIME rejected (422)."""
    async with _client() as client:
        r = await client.post(
            "/storage/upload-url", json={"content_type": "image/jpeg"}
        )
        assert r.status_code in (401, 403)

    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        owner = User(
            name=f"Uploader_{uid}", email=f"uploader_{uid}@example.com",
            google_id=f"g_{uid}_u",
        )
        session.add(owner)
        await session.commit()
        await session.refresh(owner)
        user_id = owner.id
    try:
        async with _client(_token(user_id)) as client:
            r = await client.post(
                "/storage/upload-url",
                json={"content_type": "application/pdf"},
            )
            assert r.status_code == 422

            r = await client.post(
                "/storage/upload-url", json={"content_type": "image/png"}
            )
            assert r.status_code == 200
            body = r.json()
            assert body["upload_url"].startswith("http")
            assert body["object_key"].startswith("items/")
    finally:
        async with AsyncSessionLocal() as session:
            await _cleanup(session, [user_id], [])


@pytest.mark.asyncio
async def test_feed_payload_exposes_no_object_keys():
    """6.2: raw feed JSON contains signed URLs but no R2 object keys."""
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        owner, stranger, item, found = await _setup(session, uid)
        # The FOUND item needs its own image for the URL assertion.
        session.add(ItemImage(
            item_id=found.id, object_key=f"test/{found.id}.jpg",
            content_type="image/jpeg",
        ))
        await session.commit()
        ids = {
            "users": [owner.id, stranger.id],
            "items": [item.id, found.id],
        }

    try:
        # Stranger owns FOUND here, so the owner (has LOST) views the
        # stranger's FOUND item through the feed.
        async with _client(_token(ids["users"][0])) as client:
            r = await client.get("/items/found/feed", params={"q": uid})
            assert r.status_code == 200
            assert "object_key" not in r.text
            bodies = [b for b in r.json() if b["id"] == ids["items"][1]]
            assert len(bodies) == 1
            assert bodies[0]["images"][0]["image_url"].startswith("http")
    finally:
        async with AsyncSessionLocal() as session:
            await _cleanup(session, ids["users"], ids["items"])


@pytest.mark.asyncio
async def test_embeddings_routes_are_owner_only():
    """6.3: /embeddings/* needs auth + ownership (no enumeration)."""
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        owner, stranger, item, found = await _setup(session, uid)
        ids = {
            "users": [owner.id, stranger.id],
            "items": [item.id, found.id],
        }

    try:
        async with _client() as client:
            r = await client.get(f"/embeddings/items/{item.id}/similar")
            assert r.status_code in (401, 403)
            r = await client.post(f"/embeddings/items/{item.id}")
            assert r.status_code in (401, 403)

        # Stranger probing the owner's item: 404 (no oracle).
        async with _client(_token(ids["users"][1])) as client:
            r = await client.get(
                f"/embeddings/items/{ids['items'][0]}/similar")
            assert r.status_code == 404
            r = await client.post(f"/embeddings/items/{ids['items'][0]}")
            assert r.status_code == 404

        # Owner paths work offline: embedding row pre-exists (no Gemini
        # call) and similarity search is pure pgvector.
        async with _client(_token(ids["users"][0])) as client:
            r = await client.post(f"/embeddings/items/{ids['items'][0]}")
            assert r.status_code == 200
            assert r.json()["dimension"] == DIM
            r = await client.get(
                f"/embeddings/items/{ids['items'][0]}/similar")
            assert r.status_code == 200
            assert isinstance(r.json(), list)
    finally:
        async with AsyncSessionLocal() as session:
            await _cleanup(session, ids["users"], ids["items"])


def test_signed_url_ttl_is_single_constant():
    """6.4: 300s TTL lives in one place."""
    assert StorageService.SIGNED_URL_TTL_SECONDS == 300
