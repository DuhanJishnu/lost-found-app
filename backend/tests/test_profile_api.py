"""User profile API tests (GET /users/me).

Covers the profile endpoint backing the Stitch screen 6 profile page:
identity fields plus report/match/claim statistics, scoped to the
authenticated user.
"""

import uuid

import httpx
import pytest
from sqlalchemy import delete

from app.db.database import AsyncSessionLocal
from app.main import app
from app.models.claim import Claim, ClaimStatus
from app.models.item import Item, ItemStatus, ItemType
from app.models.item_embedding import ItemEmbedding
from app.models.item_image import ItemImage
from app.models.match import Match
from app.models.notification import Notification
from app.models.user import User
from app.repositories.claim_repository import ClaimRepository
from app.repositories.match_repository import MatchRepository
from app.services.auth_service import AuthService


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
async def test_profile_requires_auth():
    async with _client() as client:
        response = await client.get("/users/me")
        assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_profile_stats_follow_lifecycle():
    """Counts reflect reports, pending match/claim, then a return."""
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
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

        lost1 = Item(
            user_id=owner.id, type=ItemType.LOST, title=f"Lost 1 {uid}",
            description="lost watch", category="Accessories",
            status=ItemStatus.ACTIVE,
        )
        lost2 = Item(
            user_id=owner.id, type=ItemType.LOST, title=f"Lost 2 {uid}",
            description="lost keys", category="Keys",
            status=ItemStatus.ACTIVE,
        )
        own_found = Item(
            user_id=owner.id, type=ItemType.FOUND,
            title=f"Own found {uid}", description="found scarf",
            category="Clothing", status=ItemStatus.ACTIVE,
        )
        found = Item(
            user_id=finder.id, type=ItemType.FOUND,
            title=f"Found {uid}", description="found watch",
            category="Accessories", status=ItemStatus.ACTIVE,
        )
        session.add_all([lost1, lost2, own_found, found])
        await session.commit()
        for item in (lost1, lost2, own_found, found):
            await session.refresh(item)

        match = await MatchRepository(session).create(
            lost_item_id=lost1.id, found_item_id=found.id,
            similarity_score=0.9,
        )
        claim = await ClaimRepository(session).create(
            match_id=match.id, claimant_id=owner.id,
        )
        await session.commit()
        user_ids = [owner.id, finder.id]
        item_ids = [lost1.id, lost2.id, own_found.id, found.id]
        claim_id, match_id = claim.id, match.id

    try:
        async with _client(_token(user_ids[0])) as client:
            response = await client.get("/users/me")
            assert response.status_code == 200
            body = response.json()
            assert body["name"].startswith("Owner_")
            assert body["email"].startswith("owner_")
            assert body["member_since"]
            assert body["stats"] == {
                "items_lost": 2,
                "items_found": 1,
                "active_matches": 1,
                "pending_claims_made": 1,
                "pending_claims_received": 0,
                "successful_returns": 0,
            }

        # Finder accepts: the return credits the finder, clears pendings.
        # (accept_claim flushes only — the service owns the commit.)
        async with AsyncSessionLocal() as session:
            accepted = await ClaimRepository(session).accept_claim(
                claim_id=claim_id, match_id=match_id,
                lost_item_id=lost1.id, found_item_id=found.id,
            )
            assert accepted is not None
            assert accepted.status == ClaimStatus.ACCEPTED
            await session.commit()

        async with _client(_token(user_ids[1])) as client:
            stats = (await client.get("/users/me")).json()["stats"]
            assert stats["items_found"] == 1
            assert stats["pending_claims_received"] == 0
            assert stats["successful_returns"] == 1

        async with _client(_token(user_ids[0])) as client:
            stats = (await client.get("/users/me")).json()["stats"]
            assert stats["pending_claims_made"] == 0
            assert stats["active_matches"] == 0
            assert stats["successful_returns"] == 0
    finally:
        async with AsyncSessionLocal() as session:
            await _cleanup(session, user_ids, item_ids)
