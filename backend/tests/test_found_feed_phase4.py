"""Phase 4 + Phase 10: FOUND feed production-readiness tests.

Covers implementation_plan.md Phase 4:
  4.1 pgvector nearest-neighbor ranking (no Python cosine loop)
  4.2 best similarity per FOUND item across multiple LOST items
  4.3 pagination (page + limit)
  4.4 category filter
  4.5 MATCHED/CLOSED items excluded (ACTIVE-only)
  4.6 own FOUND items excluded
  4.8 text search on title/description
  Feed visibility: similarity > 0.40 -> images included;
                   similarity <= 0.40 -> images empty, no object keys

Follows the existing tests/ pattern: real DB via AsyncSessionLocal,
uuid-isolated rows, cleanup in finally.
"""

import math
import uuid

import pytest
from sqlalchemy import delete

from app.db.database import AsyncSessionLocal
from app.models.item import Item, ItemStatus, ItemType
from app.models.item_embedding import ItemEmbedding
from app.models.item_image import ItemImage
from app.models.match import Match
from app.models.notification import Notification
from app.models.user import User
from app.services.found_feed_service import FoundFeedService

DIM = 768


def _vec(*weighted):
    """Sparse 768-dim vector; weighted = [(index, value), ...]."""
    v = [0.0] * DIM
    for i, val in weighted:
        v[i] = val
    norm = math.sqrt(sum(x * x for x in v))
    return [x / norm for x in v]


E1 = _vec((0, 1.0))              # lost-1 direction
E2 = _vec((1, 1.0))              # lost-2 direction
E1_E2 = _vec((0, 1.0), (1, 1.0))  # sim ~0.707 to E1 and to E2
E1_3E2 = _vec((0, 1.0), (1, 3.0))  # sim ~0.316 to E1, ~0.949 to E2


async def _make_owner_finder(session, uid):
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
    return owner, finder


async def _add_item(session, user_id, type, title, category,
                    status=ItemStatus.ACTIVE, vector=None,
                    with_image=False):
    item = Item(
        user_id=user_id, type=type, title=title,
        description=f"{title} description {uuid.uuid4().hex[:4]}",
        category=category, status=status,
    )
    session.add(item)
    await session.commit()
    await session.refresh(item)
    if vector is not None:
        session.add(ItemEmbedding(
            item_id=item.id, embedding=vector,
            model="gemini-embedding-2",
        ))
        await session.commit()
    if with_image:
        session.add(ItemImage(
            item_id=item.id, object_key=f"test/{item.id}.jpg",
            content_type="image/jpeg",
        ))
        await session.commit()
    return item


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
async def test_feed_ranked_by_pgvector_similarity():
    """4.1: distinct similarities come back in descending order."""
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        owner, finder = await _make_owner_finder(session, uid)
        lost = await _add_item(
            session, owner.id, ItemType.LOST, f"Lost phone {uid}",
            "Electronics", vector=E1,
        )
        high = await _add_item(
            session, finder.id, ItemType.FOUND, f"Phone high {uid}",
            "Electronics", vector=E1,
        )
        mid = await _add_item(
            session, finder.id, ItemType.FOUND, f"Phone mid {uid}",
            "Electronics", vector=E1_E2,
        )
        low = await _add_item(
            session, finder.id, ItemType.FOUND, f"Phone low {uid}",
            "Electronics", vector=_vec((0, 1.0), (1, 3.0)),
        )
        user_ids = [owner.id, finder.id]
        item_ids = [lost.id, high.id, mid.id, low.id]

    try:
        async with AsyncSessionLocal() as session:
            # NOTE: shared dev DB holds rows from other runs, so scope
            # to this test's rows via the uid embedded in titles.
            feed = await FoundFeedService(session).get_feed(
                owner.id, search=uid
            )
            assert [f.id for f in feed] == [high.id, mid.id, low.id]
            assert feed[0].similarity_score == pytest.approx(1.0, abs=1e-2)
            assert feed[1].similarity_score == pytest.approx(0.707, abs=1e-2)
            assert feed[2].similarity_score == pytest.approx(0.316, abs=1e-2)
    finally:
        async with AsyncSessionLocal() as session:
            await _cleanup(session, user_ids, item_ids)


@pytest.mark.asyncio
async def test_feed_uses_best_similarity_across_lost_items():
    """4.2: FOUND ranked by its best relation to any LOST item."""
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        owner, finder = await _make_owner_finder(session, uid)
        lost_a = await _add_item(
            session, owner.id, ItemType.LOST, f"Lost A {uid}",
            "Electronics", vector=E1,
        )
        lost_b = await _add_item(
            session, owner.id, ItemType.LOST, f"Lost B {uid}",
            "Keys", vector=E2,
        )
        # sim ~0.316 to Lost A, ~0.949 to Lost B -> best ~0.949
        target = await _add_item(
            session, finder.id, ItemType.FOUND, f"Found X {uid}",
            "Electronics", vector=E1_3E2,
        )
        users = [owner.id, finder.id]
        item_ids = [lost_a.id, lost_b.id, target.id]
    try:
        async with AsyncSessionLocal() as session:
            feed = await FoundFeedService(session).get_feed(owner.id)
            by_id = {f.id: f for f in feed}
            assert target.id in by_id
            assert by_id[target.id].similarity_score == pytest.approx(
                0.949, abs=1e-2
            )
    finally:
        async with AsyncSessionLocal() as session:
            await _cleanup(session, users, item_ids)


@pytest.mark.asyncio
async def test_feed_pagination_category_search_and_exclusions():
    """4.3/4.4/4.8 + 4.5/4.6: slice, filter, and hide correctly."""
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        owner, finder = await _make_owner_finder(session, uid)
        lost = await _add_item(
            session, owner.id, ItemType.LOST, f"Lost phone {uid}",
            "Electronics", vector=E1,
        )
        # Three visible FOUND items, distinct similarities
        w1 = await _add_item(
            session, finder.id, ItemType.FOUND,
            f"Redmi phone kiosk {uid}", "Electronics", vector=E1,
        )
        w2 = await _add_item(
            session, finder.id, ItemType.FOUND,
            f"Phone booth {uid}", "Electronics", vector=E1_E2,
        )
        w3 = await _add_item(
            session, finder.id, ItemType.FOUND,
            f"Leather wallet {uid}", "Accessories", vector=E1,
        )
        # Must be excluded: own, matched, closed
        own = await _add_item(
            session, owner.id, ItemType.FOUND, f"Own found {uid}",
            "Electronics", vector=E1,
        )
        matched = await _add_item(
            session, finder.id, ItemType.FOUND, f"Matched {uid}",
            "Electronics", status=ItemStatus.MATCHED, vector=E1,
        )
        closed = await _add_item(
            session, finder.id, ItemType.FOUND, f"Closed {uid}",
            "Electronics", status=ItemStatus.CLOSED, vector=E1,
        )
        user_ids = [owner.id, finder.id]
        item_ids = [lost.id, w1.id, w2.id, w3.id, own.id, matched.id,
                    closed.id]

    try:
        async with AsyncSessionLocal() as session:
            svc = FoundFeedService(session)
            # NOTE: shared dev DB holds rows from other runs, so scope
            # to this test's rows via the uid embedded in titles.
            full = await svc.get_feed(owner.id, search=uid)
            # 4.5/4.6: only ACTIVE FOUND items from other users
            assert {f.id for f in full} == {w1.id, w2.id, w3.id}

            # 4.3: pagination slices the ranked list
            p1 = await svc.get_feed(owner.id, search=uid, page=1, limit=2)
            p2 = await svc.get_feed(owner.id, search=uid, page=2, limit=2)
            assert [f.id for f in p1] == [f.id for f in full[:2]]
            assert [f.id for f in p2] == [f.id for f in full[2:]]

            # 4.4: category filter
            elec = await svc.get_feed(
                owner.id, search=uid, category="Electronics"
            )
            assert {f.id for f in elec} == {w1.id, w2.id}

            # 4.8: text search on title (router exposes this as ?q=)
            kiosk = await svc.get_feed(owner.id, search="kiosk")
            assert w1.id in {f.id for f in kiosk}
    finally:
        async with AsyncSessionLocal() as session:
            await _cleanup(session, user_ids, item_ids)


@pytest.mark.asyncio
async def test_feed_image_visibility_threshold():
    """>0.40 exposes signed images; <=0.40 hides them (no object keys)."""
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        owner, finder = await _make_owner_finder(session, uid)
        lost = await _add_item(
            session, owner.id, ItemType.LOST, f"Lost cam {uid}",
            "Electronics", vector=E1,
        )
        visible = await _add_item(
            session, finder.id, ItemType.FOUND, f"Cam {uid}",
            "Electronics", vector=E1, with_image=True,
        )
        hidden = await _add_item(
            session, finder.id, ItemType.FOUND, f"Cam far {uid}",
            "Electronics",
            vector=_vec((0, 1.0), (1, 3.0)), with_image=True,
        )
        user_ids = [owner.id, finder.id]
        item_ids = [lost.id, visible.id, hidden.id]

    try:
        async with AsyncSessionLocal() as session:
            feed = await FoundFeedService(session).get_feed(owner.id)
            by_id = {f.id: f for f in feed}
            assert by_id[visible.id].can_view_image is True
            assert by_id[visible.id].can_claim is True
            assert len(by_id[visible.id].images) == 1
            assert by_id[visible.id].images[0].image_url.startswith(
                "http"
            )
            assert by_id[hidden.id].can_view_image is False
            assert by_id[hidden.id].can_claim is False
            assert by_id[hidden.id].images == []
            # Schema has no object-key field to leak
            assert "object_key" not in by_id[hidden.id].model_dump()
    finally:
        async with AsyncSessionLocal() as session:
            await _cleanup(session, user_ids, item_ids)


@pytest.mark.asyncio
async def test_feed_items_carry_created_at():
    """Stitch screen 1: feed responses include created_at for time-ago
    labels and newest-first sorting."""
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        owner, finder = await _make_owner_finder(session, uid)
        lost = await _add_item(
            session, owner.id, ItemType.LOST, f"Lost {uid}",
            "Electronics", vector=E1,
        )
        found = await _add_item(
            session, finder.id, ItemType.FOUND, f"Found {uid}",
            "Electronics", vector=E1,
        )
        user_ids = [owner.id, finder.id]
        item_ids = [lost.id, found.id]

    try:
        async with AsyncSessionLocal() as session:
            feed = await FoundFeedService(session).get_feed(
                owner.id, search=uid
            )
            assert [f.id for f in feed] == [found.id]
            assert feed[0].created_at is not None

            detail = await FoundFeedService(session).get_item_detail(
                item_id=found.id, user_id=owner.id
            )
            assert detail is not None
            assert detail.created_at is not None
    finally:
        async with AsyncSessionLocal() as session:
            await _cleanup(session, user_ids, item_ids)


@pytest.mark.asyncio
async def test_feed_empty_without_lost_items():
    """User with no active LOST items gets an empty feed."""
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        owner, finder = await _make_owner_finder(session, uid)
        found = await _add_item(
            session, finder.id, ItemType.FOUND, f" stray {uid}",
            "Electronics", vector=E1,
        )
        user_ids = [owner.id, finder.id]
        item_ids = [found.id]

    try:
        async with AsyncSessionLocal() as session:
            assert await FoundFeedService(session).get_feed(owner.id) == []
    finally:
        async with AsyncSessionLocal() as session:
            await _cleanup(session, user_ids, item_ids)
