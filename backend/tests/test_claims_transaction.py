import asyncio
import uuid
import pytest
from fastapi import HTTPException
from sqlalchemy import select, delete

from app.db.database import AsyncSessionLocal
from app.models.claim import Claim, ClaimStatus
from app.models.item import Item, ItemStatus, ItemType
from app.models.item_embedding import ItemEmbedding
from app.models.match import Match, MatchStatus
from app.models.notification import Notification
from app.models.user import User
from app.repositories.claim_repository import ClaimRepository
from app.repositories.item_embedding_repository import ItemEmbeddingRepository
from app.repositories.item_repository import ItemRepository
from app.repositories.match_repository import MatchRepository
from app.repositories.notification_repository import NotificationRepository
from app.services.claim_service import ClaimService
from app.services.notification_service import NotificationService


def make_service(session):
    claim_repo = ClaimRepository(session)
    match_repo = MatchRepository(session)
    item_repo = ItemRepository(session)
    embedding_repo = ItemEmbeddingRepository(session)
    notif_repo = NotificationRepository(session)
    notif_service = NotificationService(notif_repo)

    return ClaimService(
        db=session,
        claim_repository=claim_repo,
        match_repository=match_repo,
        item_repository=item_repo,
        embedding_repository=embedding_repo,
        notification_service=notif_service,
    )


@pytest.mark.asyncio
async def test_manual_claim_transaction_and_lifecycle():
    """
    Test that:
    1. A manual claim creates Match(PENDING) and Claim(PENDING) atomically.
    2. Items remain ACTIVE while claim is PENDING.
    3. Duplicate claim returns 409 Conflict.
    4. Accept claim transitions Claim to ACCEPTED, Match to CONFIRMED, and both items to CLOSED.
    """
    uid = uuid.uuid4().hex[:8]

    async with AsyncSessionLocal() as session:
        # Create claimant and finder
        claimant = User(name=f"Claimant_{uid}", email=f"claimant_{uid}@example.com", google_id=f"g_{uid}_1")
        finder = User(name=f"Finder_{uid}", email=f"finder_{uid}@example.com", google_id=f"g_{uid}_2")
        session.add_all([claimant, finder])
        await session.commit()
        await session.refresh(claimant)
        await session.refresh(finder)

        # Create LOST item for claimant
        lost_item = Item(
            user_id=claimant.id,
            type=ItemType.LOST,
            title="Black Wallet",
            description="Leather black wallet with card",
            category="Accessories",
            status=ItemStatus.ACTIVE,
        )
        # Create FOUND item for finder
        found_item = Item(
            user_id=finder.id,
            type=ItemType.FOUND,
            title="Black Leather Wallet",
            description="Found a black leather wallet near library",
            category="Accessories",
            status=ItemStatus.ACTIVE,
        )
        session.add_all([lost_item, found_item])
        await session.commit()
        await session.refresh(lost_item)
        await session.refresh(found_item)

        # High similarity embeddings (identical vector of 768 dims)
        unit_vec = [1.0 / (768 ** 0.5)] * 768
        emb1 = ItemEmbedding(item_id=lost_item.id, embedding=unit_vec, model="gemini-embedding-2")
        emb2 = ItemEmbedding(item_id=found_item.id, embedding=unit_vec, model="gemini-embedding-2")
        session.add_all([emb1, emb2])
        await session.commit()

        claimant_id = claimant.id
        finder_id = finder.id
        lost_id = lost_item.id
        found_id = found_item.id

    try:
        # 1. Create manual claim
        async with AsyncSessionLocal() as session:
            service = make_service(session)
            claim = await service.create_manual_claim(
                user_id=claimant_id,
                lost_item_id=lost_id,
                found_item_id=found_id,
            )

            assert claim.id is not None
            assert claim.status == ClaimStatus.PENDING
            assert claim.claimant_id == claimant_id

            # Verify match state
            match_repo = MatchRepository(session)
            match = await match_repo.get_by_id(claim.match_id)
            assert match is not None
            assert match.status == MatchStatus.PENDING
            assert match.similarity_score > 0.40

            # Verify Task 2.7: items remain ACTIVE while claim is PENDING
            item_repo = ItemRepository(session)
            l_item = await item_repo.get_by_id(lost_id)
            f_item = await item_repo.get_by_id(found_id)
            assert l_item.status == ItemStatus.ACTIVE
            assert f_item.status == ItemStatus.ACTIVE

            claim_id = claim.id
            match_id = match.id

        # 2. Duplicate claim prevention (Task 2.4)
        async with AsyncSessionLocal() as session:
            service = make_service(session)
            with pytest.raises(HTTPException) as exc_info:
                await service.create_manual_claim(
                    user_id=claimant_id,
                    lost_item_id=lost_id,
                    found_item_id=found_id,
                )
            assert exc_info.value.status_code == 409
            assert "already exists" in exc_info.value.detail

        # 3. Accept claim (Task 2.8)
        async with AsyncSessionLocal() as session:
            service = make_service(session)
            accepted_claim = await service.update_claim_status(
                claim_id=claim_id,
                user_id=finder_id,
                status=ClaimStatus.ACCEPTED,
            )
            assert accepted_claim.status == ClaimStatus.ACCEPTED

            # Verify match is now CONFIRMED
            match_repo = MatchRepository(session)
            match = await match_repo.get_by_id(match_id)
            assert match.status == MatchStatus.CONFIRMED

            # Verify both items are now CLOSED
            item_repo = ItemRepository(session)
            l_item = await item_repo.get_by_id(lost_id)
            f_item = await item_repo.get_by_id(found_id)
            assert l_item.status == ItemStatus.CLOSED
            assert f_item.status == ItemStatus.CLOSED

    finally:
        # Cleanup test records
        async with AsyncSessionLocal() as session:
            await session.execute(delete(Notification).where(Notification.user_id.in_([claimant_id, finder_id])))
            await session.execute(delete(Claim).where(Claim.claimant_id == claimant_id))
            await session.execute(delete(Match).where(Match.lost_item_id == lost_id))
            await session.execute(delete(ItemEmbedding).where(ItemEmbedding.item_id.in_([lost_id, found_id])))
            await session.execute(delete(Item).where(Item.id.in_([lost_id, found_id])))
            await session.execute(delete(User).where(User.id.in_([claimant_id, finder_id])))
            await session.commit()


@pytest.mark.asyncio
async def test_concurrent_accept_and_reject_race_condition():
    """
    Test Task 2.10:
    Two concurrent requests trying to decide the same claim (one accept, one reject).
    Exactly one must succeed, and the other must raise 'Claim has already been decided'.
    """
    uid = uuid.uuid4().hex[:8]

    async with AsyncSessionLocal() as session:
        claimant = User(name=f"Claimant_{uid}", email=f"claimant_{uid}@example.com", google_id=f"g_{uid}_1")
        finder = User(name=f"Finder_{uid}", email=f"finder_{uid}@example.com", google_id=f"g_{uid}_2")
        session.add_all([claimant, finder])
        await session.commit()
        await session.refresh(claimant)
        await session.refresh(finder)

        lost_item = Item(
            user_id=claimant.id,
            type=ItemType.LOST,
            title="Silver Keys",
            description="Keychain with 3 keys",
            category="Keys",
            status=ItemStatus.ACTIVE,
        )
        found_item = Item(
            user_id=finder.id,
            type=ItemType.FOUND,
            title="Keys found",
            description="Set of silver keys found",
            category="Keys",
            status=ItemStatus.ACTIVE,
        )
        session.add_all([lost_item, found_item])
        await session.commit()
        await session.refresh(lost_item)
        await session.refresh(found_item)

        unit_vec = [1.0 / (768 ** 0.5)] * 768
        emb1 = ItemEmbedding(item_id=lost_item.id, embedding=unit_vec, model="gemini-embedding-2")
        emb2 = ItemEmbedding(item_id=found_item.id, embedding=unit_vec, model="gemini-embedding-2")
        session.add_all([emb1, emb2])
        await session.commit()

        claimant_id = claimant.id
        finder_id = finder.id
        lost_id = lost_item.id
        found_id = found_item.id

    try:
        # Create manual claim
        async with AsyncSessionLocal() as session:
            service = make_service(session)
            claim = await service.create_manual_claim(
                user_id=claimant_id,
                lost_item_id=lost_id,
                found_item_id=found_id,
            )
            claim_id = claim.id

        # Now simulate two simultaneous requests from separate DB sessions:
        # Request A: accept
        # Request B: reject
        async def do_accept():
            async with AsyncSessionLocal() as s:
                svc = make_service(s)
                return await svc.update_claim_status(
                    claim_id=claim_id,
                    user_id=finder_id,
                    status=ClaimStatus.ACCEPTED,
                )

        async def do_reject():
            async with AsyncSessionLocal() as s:
                svc = make_service(s)
                return await svc.update_claim_status(
                    claim_id=claim_id,
                    user_id=finder_id,
                    status=ClaimStatus.REJECTED,
                )

        results = await asyncio.gather(do_accept(), do_reject(), return_exceptions=True)

        successes = [r for r in results if not isinstance(r, Exception)]
        failures = [r for r in results if isinstance(r, Exception)]

        # Exactly one must succeed!
        assert len(successes) == 1, f"Expected 1 success, got {len(successes)}"
        # Exactly one must fail with 'Claim has already been decided'!
        assert len(failures) == 1, f"Expected 1 failure, got {len(failures)}"
        assert "already been decided" in str(failures[0])

    finally:
        async with AsyncSessionLocal() as session:
            await session.execute(delete(Notification).where(Notification.user_id.in_([claimant_id, finder_id])))
            await session.execute(delete(Claim).where(Claim.claimant_id == claimant_id))
            await session.execute(delete(Match).where(Match.lost_item_id == lost_id))
            await session.execute(delete(ItemEmbedding).where(ItemEmbedding.item_id.in_([lost_id, found_id])))
            await session.execute(delete(Item).where(Item.id.in_([lost_id, found_id])))
            await session.execute(delete(User).where(User.id.in_([claimant_id, finder_id])))
            await session.commit()
