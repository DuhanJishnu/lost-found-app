"""Phase 9 + Phase 10: Notifications API hardening tests.

Covers implementation_plan.md Phase 9:
  9.1 all endpoints scoped to the authenticated user
  9.2 PATCH /notifications/read-all
  9.3 unread-count uses an efficient COUNT query; list supports limit
  9.5 match/claim notifications persist in the same transaction as
      their event (no silent loss)

Router tests use httpx ASGITransport against the real app + dev DB.
"""

import uuid

import httpx
import pytest
from sqlalchemy import delete, select

from app.db.database import AsyncSessionLocal
from app.main import app
from app.models.claim import Claim, ClaimStatus
from app.models.item import Item, ItemStatus, ItemType
from app.models.item_embedding import ItemEmbedding
from app.models.item_image import ItemImage
from app.models.match import Match, MatchStatus
from app.models.notification import Notification
from app.models.user import User
from app.repositories.claim_repository import ClaimRepository
from app.repositories.item_embedding_repository import ItemEmbeddingRepository
from app.repositories.item_repository import ItemRepository
from app.repositories.match_repository import MatchRepository
from app.repositories.notification_repository import NotificationRepository
from app.services.auth_service import AuthService
from app.services.claim_service import ClaimService
from app.services.notification_service import NotificationService

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


def _claim_service(session):
    notif_service = NotificationService(NotificationRepository(session))
    return ClaimService(
        db=session,
        claim_repository=ClaimRepository(session),
        match_repository=MatchRepository(session),
        item_repository=ItemRepository(session),
        embedding_repository=ItemEmbeddingRepository(session),
        notification_service=notif_service,
    )


async def _setup_pair(session, uid):
    claimant = User(
        name=f"Claimant_{uid}", email=f"claimant_{uid}@example.com",
        google_id=f"g_{uid}_c",
    )
    finder = User(
        name=f"Finder_{uid}", email=f"finder_{uid}@example.com",
        google_id=f"g_{uid}_f",
    )
    session.add_all([claimant, finder])
    await session.commit()
    await session.refresh(claimant)
    await session.refresh(finder)

    lost = Item(
        user_id=claimant.id, type=ItemType.LOST,
        title="Black Wallet", description="Leather black wallet",
        category="Accessories", status=ItemStatus.ACTIVE,
    )
    found = Item(
        user_id=finder.id, type=ItemType.FOUND,
        title="Black Wallet Found", description="Found black wallet",
        category="Accessories", status=ItemStatus.ACTIVE,
    )
    session.add_all([lost, found])
    await session.commit()
    await session.refresh(lost)
    await session.refresh(found)

    session.add_all([
        ItemEmbedding(item_id=lost.id, embedding=_unit(0), model="t"),
        ItemEmbedding(item_id=found.id, embedding=_unit(0), model="t"),
    ])
    await session.commit()
    return claimant, finder, lost, found


async def _cleanup(session, user_ids, item_ids):
    await session.execute(
        delete(Notification).where(Notification.user_id.in_(user_ids))
    )
    await session.execute(
        delete(Claim).where(Claim.claimant_id.in_(user_ids))
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
async def test_scoping_limit_and_read_all():
    """9.1/9.2/9.3: user-scoped list+read, limit, read-all count."""
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        claimant, finder, lost, found = await _setup_pair(session, uid)
        repo = NotificationRepository(session)
        mine = [
            await repo.create(
                user_id=claimant.id, match_id=1,
                title=f"Note {i} {uid}", message="hello",
            )
            for i in range(3)
        ]
        await repo.create(
            user_id=finder.id, match_id=1,
            title=f"Other {uid}", message="not mine",
        )
        user_ids = [claimant.id, finder.id]
        item_ids = [lost.id, found.id]

    try:
        async with _client(_token(user_ids[0])) as client:
            # 9.1: list contains only my notifications, newest first.
            rows = (await client.get("/notifications")).json()
            assert len(rows) == 3
            assert all(r["user_id"] == user_ids[0] for r in rows)

            # 9.3: limit bounds the payload.
            rows = (await client.get(
                "/notifications", params={"limit": 2})).json()
            assert len(rows) == 2

            # 9.3: COUNT query accuracy.
            count = (await client.get(
                "/notifications/unread-count")).json()
            assert count == {"count": 3}

            # 9.1: reading someone else's notification is 404.
            async with AsyncSessionLocal() as s2:
                other = (await s2.execute(select(Notification).where(
                    Notification.user_id == user_ids[1]))).scalar_one()
                other_id = other.id
            r = await client.patch(f"/notifications/{other_id}/read")
            assert r.status_code == 404

            # Single read works and drops the count.
            r = await client.patch(
                f"/notifications/{mine[0].id}/read")
            assert r.status_code == 200
            assert r.json()["is_read"] is True

            # 9.2: read-all marks the rest, returns the count.
            r = await client.patch("/notifications/read-all")
            assert r.status_code == 200
            assert r.json() == {"marked_read": 2}
            count = (await client.get(
                "/notifications/unread-count")).json()
            assert count == {"count": 0}

            # Idempotent: second call marks zero.
            r = await client.patch("/notifications/read-all")
            assert r.json() == {"marked_read": 0}

        # Finder side untouched.
        async with _client(_token(user_ids[1])) as client:
            count = (await client.get(
                "/notifications/unread-count")).json()
            assert count == {"count": 1}
    finally:
        async with AsyncSessionLocal() as session:
            await _cleanup(session, user_ids, item_ids)


@pytest.mark.asyncio
async def test_claim_notifications_created_transactionally():
    """9.5: finder notified on create, claimant on accept — same tx."""
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        claimant, finder, lost, found = await _setup_pair(session, uid)
        user_ids = [claimant.id, finder.id]
        item_ids = [lost.id, found.id]

    try:
        async with AsyncSessionLocal() as session:
            service = _claim_service(session)
            claim = await service.create_manual_claim(
                user_id=user_ids[0],
                lost_item_id=item_ids[0],
                found_item_id=item_ids[1],
            )
            claim_id = claim.id

        # Finder notification exists immediately (same commit).
        async with AsyncSessionLocal() as session:
            notes = (await session.execute(select(Notification).where(
                Notification.user_id == user_ids[1]))).scalars().all()
            assert len(notes) == 1
            assert notes[0].claim_id == claim_id
            assert notes[0].title == "New claim received"

        # Accept notifies the claimant in the same commit.
        async with AsyncSessionLocal() as session:
            service = _claim_service(session)
            await service.update_claim_status(
                claim_id=claim_id,
                user_id=user_ids[1],
                status=ClaimStatus.ACCEPTED,
            )

        async with AsyncSessionLocal() as session:
            notes = (await session.execute(select(Notification).where(
                Notification.user_id == user_ids[0]))).scalars().all()
            assert len(notes) == 1
            assert notes[0].title == "Claim accepted"
    finally:
        async with AsyncSessionLocal() as session:
            await _cleanup(session, user_ids, item_ids)
