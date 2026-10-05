"""Phase 3 + Phase 10: Matches API cleanup tests.

Covers implementation_plan.md Phase 3:
  3.1 GET /matches visibility (service layer)
  3.2 GET /matches/{id} ownership check
  3.4 confirm rejects competing pending matches transactionally
  3.5 MatchResponse includes lost_item / found_item summaries

Follows the existing tests/ pattern: real DB via AsyncSessionLocal,
uuid-isolated rows, cleanup in finally.
"""

import uuid

import pytest
from sqlalchemy import delete

from app.db.database import AsyncSessionLocal
from app.models.item import Item, ItemStatus, ItemType
from app.models.item_embedding import ItemEmbedding
from app.models.match import Match, MatchStatus
from app.models.notification import Notification
from app.models.user import User
from app.repositories.item_embedding_repository import ItemEmbeddingRepository
from app.repositories.item_repository import ItemRepository
from app.repositories.match_repository import MatchRepository
from app.repositories.notification_repository import NotificationRepository
from app.services.match_service import MatchService
from app.services.notification_service import NotificationService


def make_service(session):
    return MatchService(
        item_repository=ItemRepository(session),
        embedding_repository=ItemEmbeddingRepository(session),
        match_repository=MatchRepository(session),
        notification_service=NotificationService(
            NotificationRepository(session)
        ),
    )


async def _make_users(session, uid):
    claimant = User(
        name=f"Lost_{uid}",
        email=f"lost_{uid}@example.com",
        google_id=f"g_{uid}_lost",
    )
    finder_a = User(
        name=f"FinderA_{uid}",
        email=f"findera_{uid}@example.com",
        google_id=f"g_{uid}_fa",
    )
    finder_b = User(
        name=f"FinderB_{uid}",
        email=f"finderb_{uid}@example.com",
        google_id=f"g_{uid}_fb",
    )
    stranger = User(
        name=f"Stranger_{uid}",
        email=f"stranger_{uid}@example.com",
        google_id=f"g_{uid}_st",
    )
    session.add_all([claimant, finder_a, finder_b, stranger])
    await session.commit()
    for u in (claimant, finder_a, finder_b, stranger):
        await session.refresh(u)
    return claimant, finder_a, finder_b, stranger


async def _make_items(session, claimant, finder_a, finder_b, uid):
    lost = Item(
        user_id=claimant.id,
        type=ItemType.LOST,
        title=f"Lost wallet {uid}",
        description="black leather wallet lost near park",
        category="Accessories",
        status=ItemStatus.ACTIVE,
    )
    found_a = Item(
        user_id=finder_a.id,
        type=ItemType.FOUND,
        title=f"Found wallet A {uid}",
        description="black wallet found near park",
        category="Accessories",
        status=ItemStatus.ACTIVE,
    )
    found_b = Item(
        user_id=finder_b.id,
        type=ItemType.FOUND,
        title=f"Found wallet B {uid}",
        description="black wallet found near station",
        category="Accessories",
        status=ItemStatus.ACTIVE,
    )
    session.add_all([lost, found_a, found_b])
    await session.commit()
    for i in (lost, found_a, found_b):
        await session.refresh(i)
    return lost, found_a, found_b


async def _cleanup(session, user_ids, item_ids, lost_id):
    await session.execute(
        delete(Notification).where(Notification.user_id.in_(user_ids))
    )
    await session.execute(
        delete(Match).where(Match.lost_item_id == lost_id)
    )
    await session.execute(
        delete(ItemEmbedding).where(ItemEmbedding.item_id.in_(item_ids))
    )
    await session.execute(delete(Item).where(Item.id.in_(item_ids)))
    await session.execute(delete(User).where(User.id.in_(user_ids)))
    await session.commit()


@pytest.mark.asyncio
async def test_match_list_visibility_and_enriched_schema():
    """3.1 + 3.5: each party sees only their matches, with summaries."""
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        claimant, finder_a, finder_b, stranger = await _make_users(
            session, uid
        )
        lost, found_a, found_b = await _make_items(
            session, claimant, finder_a, finder_b, uid
        )
        match_repo = MatchRepository(session)
        m1 = await match_repo.create(
            lost_item_id=lost.id, found_item_id=found_a.id,
            similarity_score=0.9,
        )
        m2 = await match_repo.create(
            lost_item_id=lost.id, found_item_id=found_b.id,
            similarity_score=0.8,
        )
        await session.commit()
        ids = {
            "users": [claimant.id, finder_a.id, finder_b.id, stranger.id],
            "items": [lost.id, found_a.id, found_b.id],
            "lost": lost.id,
        }
        m1_id, m2_id = m1.id, m2.id

    try:
        async with AsyncSessionLocal() as session:
            svc = make_service(session)
            # Lost owner sees both
            seen = await svc.list_matches_for_user(claimant.id)
            assert {m["id"] for m in seen} == {m1_id, m2_id}
            # Finder A sees only their match
            seen_a = await svc.list_matches_for_user(finder_a.id)
            assert [m["id"] for m in seen_a] == [m1_id]
            # Stranger sees nothing
            seen_s = await svc.list_matches_for_user(stranger.id)
            assert seen_s == []
            # 3.5: enriched summaries present
            first = seen[0]
            assert first["lost_item"]["id"] == lost.id
            assert first["lost_item"]["title"] == lost.title
            assert first["found_item"]["id"] in (
                found_a.id, found_b.id,
            )
            assert first["found_item"]["category"] == "Accessories"
    finally:
        async with AsyncSessionLocal() as session:
            await _cleanup(session, ids["users"], ids["items"], ids["lost"])


@pytest.mark.asyncio
async def test_match_detail_ownership_check():
    """3.2: owner can fetch single match, stranger gets ValueError."""
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        claimant, finder_a, finder_b, stranger = await _make_users(
            session, uid
        )
        lost, found_a, found_b = await _make_items(
            session, claimant, finder_a, finder_b, uid
        )
        match_repo = MatchRepository(session)
        m = await match_repo.create(
            lost_item_id=lost.id, found_item_id=found_a.id,
            similarity_score=0.85,
        )
        await session.commit()
        ids = {
            "users": [claimant.id, finder_a.id, finder_b.id, stranger.id],
            "items": [lost.id, found_a.id, found_b.id],
            "lost": lost.id,
        }
        match_id = m.id

    try:
        async with AsyncSessionLocal() as session:
            svc = make_service(session)
            detail = await svc.get_match_for_user(match_id, claimant.id)
            assert detail["id"] == match_id
            assert detail["lost_item"]["id"] == lost.id
            assert detail["found_item"]["id"] == found_a.id
            with pytest.raises(ValueError, match="Match not found"):
                await svc.get_match_for_user(match_id, stranger.id)
    finally:
        async with AsyncSessionLocal() as session:
            await _cleanup(session, ids["users"], ids["items"], ids["lost"])


@pytest.mark.asyncio
async def test_confirm_rejects_competing_matches_transactionally():
    """3.4: CONFIRM -> items MATCHED, competitors REJECTED, one commit."""
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        claimant, finder_a, finder_b, stranger = await _make_users(
            session, uid
        )
        lost, found_a, found_b = await _make_items(
            session, claimant, finder_a, finder_b, uid
        )
        match_repo = MatchRepository(session)
        m1 = await match_repo.create(
            lost_item_id=lost.id, found_item_id=found_a.id,
            similarity_score=0.9,
        )
        m2 = await match_repo.create(
            lost_item_id=lost.id, found_item_id=found_b.id,
            similarity_score=0.8,
        )
        await session.commit()
        ids = {
            "users": [claimant.id, finder_a.id, finder_b.id, stranger.id],
            "items": [lost.id, found_a.id, found_b.id],
            "lost": lost.id,
        }
        m1_id, m2_id = m1.id, m2.id

    try:
        async with AsyncSessionLocal() as session:
            svc = make_service(session)
            # Only the LOST owner may confirm
            with pytest.raises(PermissionError):
                await svc.update_match_status(
                    match_id=m1_id,
                    user_id=finder_a.id,
                    status=MatchStatus.CONFIRMED,
                )
            confirmed = await svc.update_match_status(
                match_id=m1_id,
                user_id=claimant.id,
                status=MatchStatus.CONFIRMED,
            )
            assert confirmed.status == MatchStatus.CONFIRMED

        async with AsyncSessionLocal() as session:
            match_repo = MatchRepository(session)
            item_repo = ItemRepository(session)
            m1_after = await match_repo.get_by_id(m1_id)
            m2_after = await match_repo.get_by_id(m2_id)
            assert m1_after.status == MatchStatus.CONFIRMED
            # Competitor involving the same LOST item is rejected
            assert m2_after.status == MatchStatus.REJECTED
            l_item = await item_repo.get_by_id(lost.id)
            f_item = await item_repo.get_by_id(found_a.id)
            assert l_item.status == ItemStatus.MATCHED
            assert f_item.status == ItemStatus.MATCHED
            # Decided match cannot be decided again
            svc = make_service(session)
            with pytest.raises(ValueError, match="already been decided"):
                await svc.update_match_status(
                    match_id=m1_id,
                    user_id=claimant.id,
                    status=MatchStatus.CONFIRMED,
                )
    finally:
        async with AsyncSessionLocal() as session:
            await _cleanup(session, ids["users"], ids["items"], ids["lost"])
