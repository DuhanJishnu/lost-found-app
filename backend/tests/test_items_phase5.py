"""Phase 5 + Phase 10: Items API cleanup & authorization tests.

Covers implementation_plan.md Phase 5:
  5.1 GET /items requires authentication (deprecated, gated)
  5.2 GET /items/{id} visibility: own -> full; other's FOUND -> detail
      rules; other's LOST -> 404
  5.3 GET /items/me newest-first
  5.5 image_keys validated at creation (extension, prefix, existence)
  5.6 server-side MIME + size validation

Router tests use httpx ASGITransport against the real app + dev DB;
service tests inject a stub storage so no R2 network is needed.
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
from app.repositories.item_repository import ItemRepository
from app.schemas.item import CreateItemRequest
from app.schemas.storage import UploadUrlRequest
from app.services.auth_service import AuthService
from app.services.item_service import ItemService

DIM = 768


def _unit(idx):
    v = [0.0] * DIM
    v[idx] = 1.0
    return v


class StubStorage:
    """Fake R2 metadata source: no network."""

    def __init__(self, meta):
        self.meta = meta

    def head_object(self, *, object_key):
        return self.meta.get(object_key)


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


async def _make_user(session, uid, tag):
    user = User(
        name=f"{tag}_{uid}", email=f"{tag}_{uid}@example.com",
        google_id=f"g_{uid}_{tag}",
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


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
async def test_generic_list_requires_auth():
    """5.1: GET /items without a token is rejected; with token it works."""
    async with _client() as client:
        response = await client.get("/items")
        assert response.status_code in (401, 403)

    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        user = await _make_user(session, uid, "lister")
        user_id = user.id
    try:
        async with _client(_token(user_id)) as client:
            response = await client.get("/items", params={"limit": 1})
            assert response.status_code == 200
            assert isinstance(response.json(), list)
    finally:
        async with AsyncSessionLocal() as session:
            await _cleanup(session, [user_id], [])


@pytest.mark.asyncio
async def test_detail_visibility_rules():
    """5.2: own -> full; other's FOUND -> detail rules; other's LOST -> 404."""
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        owner = await _make_user(session, uid, "owner")
        viewer = await _make_user(session, uid, "viewer")
        stranger = await _make_user(session, uid, "stranger")

        owner_lost = Item(
            user_id=owner.id, type=ItemType.LOST,
            title=f"Owner lost {uid}", description="lost watch",
            category="Accessories", status=ItemStatus.ACTIVE,
        )
        owner_found = Item(
            user_id=owner.id, type=ItemType.FOUND,
            title=f"Owner found {uid}", description="found keys",
            category="Keys", status=ItemStatus.ACTIVE,
        )
        viewer_lost = Item(
            user_id=viewer.id, type=ItemType.LOST,
            title=f"Viewer lost {uid}", description="lost keys",
            category="Keys", status=ItemStatus.ACTIVE,
        )
        session.add_all([owner_lost, owner_found, viewer_lost])
        await session.commit()
        for i in (owner_lost, owner_found, viewer_lost):
            await session.refresh(i)
        # Embeddings so the viewer/owner-found pair has similarity 1.0
        session.add_all([
            ItemEmbedding(item_id=owner_lost.id, embedding=_unit(0),
                          model="t"),
            ItemEmbedding(item_id=owner_found.id, embedding=_unit(0),
                          model="t"),
            ItemEmbedding(item_id=viewer_lost.id, embedding=_unit(0),
                          model="t"),
        ])
        await session.commit()
        ids = {
            "users": [owner.id, viewer.id, stranger.id],
            "items": [owner_lost.id, owner_found.id, viewer_lost.id],
        }

    try:
        # Own item -> full ItemResponse (has user_id + images).
        async with _client(_token(ids["users"][0])) as client:
            r = await client.get(f"/items/{ids['items'][0]}")
            assert r.status_code == 200
            assert r.json()["user_id"] == ids["users"][0]

        # Other's LOST item -> 404 even for an authenticated user.
        async with _client(_token(ids["users"][1])) as client:
            r = await client.get(f"/items/{ids['items'][0]}")
            assert r.status_code == 404

        # Other's ACTIVE FOUND item -> detail rules (similarity visible).
        async with _client(_token(ids["users"][1])) as client:
            r = await client.get(f"/items/{ids['items'][1]}")
            assert r.status_code == 200
            body = r.json()
            assert body["similarity_score"] == pytest.approx(1.0, abs=1e-2)
            assert body["can_view_image"] is True

        # Viewer with no LOST item -> 403 LOST_ITEM_REQUIRED.
        async with _client(_token(ids["users"][2])) as client:
            r = await client.get(f"/items/{ids['items'][1]}")
            assert r.status_code == 403
            assert r.json()["detail"]["code"] == "LOST_ITEM_REQUIRED"
    finally:
        async with AsyncSessionLocal() as session:
            await _cleanup(session, ids["users"], ids["items"])


@pytest.mark.asyncio
async def test_me_returns_newest_first():
    """5.3: GET /items/me is newest-first and scoped to the caller."""
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        user = await _make_user(session, uid, "ordered")
        other = await _make_user(session, uid, "other")
        first = Item(
            user_id=user.id, type=ItemType.LOST, title=f"First {uid}",
            description="first item", category="Misc",
            status=ItemStatus.ACTIVE,
        )
        session.add(first)
        await session.commit()
        await session.refresh(first)
        second = Item(
            user_id=user.id, type=ItemType.FOUND, title=f"Second {uid}",
            description="second item", category="Misc",
            status=ItemStatus.ACTIVE,
        )
        foreign = Item(
            user_id=other.id, type=ItemType.LOST, title=f"Foreign {uid}",
            description="foreign item", category="Misc",
            status=ItemStatus.ACTIVE,
        )
        session.add_all([second, foreign])
        await session.commit()
        await session.refresh(second)
        user_id, item_ids = user.id, [first.id, second.id]
        all_ids = [first.id, second.id, foreign.id]
        other_id = other.id

    try:
        async with _client(_token(user_id)) as client:
            r = await client.get("/items/me")
            assert r.status_code == 200
            got = [i["id"] for i in r.json()]
            assert got == sorted(item_ids, reverse=True)
            assert all(i["user_id"] == user_id for i in r.json())
    finally:
        async with AsyncSessionLocal() as session:
            await _cleanup(session, [user_id, other_id], all_ids)


@pytest.mark.asyncio
async def test_create_validates_image_keys():
    """5.5/5.6: bad extension, foreign prefix, missing object rejected."""
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        user = await _make_user(session, uid, "creator")
        user_id = user.id
        repo = ItemRepository(session)

        def req(*keys):
            return CreateItemRequest(
                type=ItemType.LOST, title="Lost bag",
                description="black backpack", category="Bags",
                image_keys=list(keys),
            )

        # Unknown extension: rejected without any R2 call.
        svc = ItemService(repo, StubStorage({}))
        with pytest.raises(ValueError, match="Unsupported image type"):
            await svc.create_item(user_id=user_id, data=req("items/x.exe"))

        # Key outside the upload folder: rejected (MVP session scoping).
        with pytest.raises(ValueError, match="Upload the image first"):
            await svc.create_item(
                user_id=user_id, data=req("other/x.jpg"))

        # Missing R2 object: rejected.
        with pytest.raises(ValueError, match="was not found"):
            await svc.create_item(
                user_id=user_id, data=req("items/missing.jpg"))

        # Oversize object: rejected (server-side 5 MB cap).
        big = ItemService(
            repo, StubStorage({"items/big.jpg": {
                "ContentLength": 6 * 1024 * 1024,
                "ContentType": "image/jpeg",
            }}),
        )
        with pytest.raises(ValueError, match="exceeds the 5 MB limit"):
            await big.create_item(user_id=user_id, data=req("items/big.jpg"))

        # Valid key: created with server-derived content type.
        ok = ItemService(
            repo, StubStorage({"items/ok.jpg": {
                "ContentLength": 1024, "ContentType": "image/jpeg",
            }}),
        )
        item = await ok.create_item(user_id=user_id, data=req("items/ok.jpg"))
        assert item.images[0].object_key == "items/ok.jpg"
        assert item.images[0].content_type == "image/jpeg"
        created = [item.id]

    async with AsyncSessionLocal() as session:
        await _cleanup(session, [user_id], created)


@pytest.mark.asyncio
async def test_upload_url_rejects_non_image_mime():
    """5.6: schema-level MIME allowlist (422 before any R2 call)."""
    with pytest.raises(Exception):
        UploadUrlRequest(content_type="application/pdf")
    assert UploadUrlRequest(content_type="image/png").content_type == \
        "image/png"
