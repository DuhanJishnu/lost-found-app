"""Community stats API tests (GET /stats/community)."""

import uuid

import httpx
import pytest
from sqlalchemy import delete

from app.db.database import AsyncSessionLocal
from app.main import app
from app.models.claim import Claim, ClaimStatus
from app.models.item import Item, ItemStatus, ItemType
from app.models.match import Match
from app.models.user import User
from app.repositories.claim_repository import ClaimRepository
from app.repositories.match_repository import MatchRepository
from app.services.auth_service import AuthService


def _client(token=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
        headers=headers,
    )


@pytest.mark.asyncio
async def test_community_stats_require_auth():
    async with _client() as client:
        response = await client.get("/stats/community")
        assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_community_stats_counts():
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

        lost = Item(
            user_id=owner.id, type=ItemType.LOST, title=f"Lost {uid}",
            description="lost watch", category="Accessories",
            status=ItemStatus.ACTIVE,
        )
        found = Item(
            user_id=finder.id, type=ItemType.FOUND, title=f"Found {uid}",
            description="found watch", category="Accessories",
            status=ItemStatus.ACTIVE,
        )
        session.add_all([lost, found])
        await session.commit()
        await session.refresh(lost)
        await session.refresh(found)

        match = await MatchRepository(session).create(
            lost_item_id=lost.id, found_item_id=found.id,
            similarity_score=0.9,
        )
        claim = await ClaimRepository(session).create(
            match_id=match.id, claimant_id=owner.id,
        )
        claim.status = ClaimStatus.ACCEPTED
        await session.commit()

        before_users = None
        user_ids = [owner.id, finder.id]
        item_ids = [lost.id, found.id]

    try:
        token = AuthService().create_api_token(owner.id)
        async with _client(token) as client:
            response = await client.get("/stats/community")
            assert response.status_code == 200, response.text
            body = response.json()
            assert body["total_users"] >= 2
            assert body["items_lost"] >= 1
            assert body["items_found"] >= 1
            assert body["successful_returns"] >= 1
            before_users = body["total_users"]
    finally:
        async with AsyncSessionLocal() as session:
            await session.execute(
                delete(Claim).where(Claim.claimant_id.in_(user_ids))
            )
            await session.execute(
                delete(Match).where(Match.lost_item_id.in_(item_ids))
            )
            await session.execute(delete(Item).where(Item.id.in_(item_ids)))
            await session.execute(delete(User).where(User.id.in_(user_ids)))
            await session.commit()

    assert before_users is not None
