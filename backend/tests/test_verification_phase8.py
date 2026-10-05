"""Phase 8 + Phase 10: ownership verification questionnaire tests.

Covers implementation_plan.md Phase 8:
  8.1/8.2/8.3 question + answer-hash models and categories
  8.4 question generation gated on a valid (lost, found) pair
  8.5 POST /claims/questions returns the seeded question set
  8.6 POST /claims/answers scores groundedness, issues token on pass
  8.7 POST /claims/ requires the token (missing/invalid/mismatched
      token rejected; answers linked to the created claim)
  8.8 answers are hashed (never plain text); scoring is grounded in the
      claimant's own LOST report

Router tests use httpx ASGITransport against the real app + dev DB.
"""

import uuid

import httpx
import pytest
from sqlalchemy import delete, select

from app.db.database import AsyncSessionLocal
from app.main import app
from app.models.claim import Claim
from app.models.claim_answer import ClaimAnswer
from app.models.item import Item, ItemStatus, ItemType
from app.models.item_embedding import ItemEmbedding
from app.models.item_image import ItemImage
from app.models.match import Match
from app.models.notification import Notification
from app.models.user import User
from app.services.auth_service import AuthService

DIM = 768

# LOST report tokens: black, leather, wallet, card, slot, zip.
LOST_TITLE = "Black leather wallet"
LOST_DESC = "Black leather wallet with card slot and zip"


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
        user_id=claimant.id, type=ItemType.LOST, title=LOST_TITLE,
        description=LOST_DESC, category="Accessories",
        status=ItemStatus.ACTIVE,
    )
    found = Item(
        user_id=finder.id, type=ItemType.FOUND,
        title="Black leather wallet found",
        description="Found a black leather wallet near the library",
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
        delete(ClaimAnswer).where(ClaimAnswer.claimant_id.in_(user_ids))
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


def _grounded_answers(questions):
    """Every answer shares a token with the LOST report."""
    words = ["black", "leather", "wallet", "card", "slot", "zip",
             "black wallet"]
    return [
        {"question_id": q["id"], "answer": f"{words[i % len(words)]} detail"}
        for i, q in enumerate(questions)
    ]


def _gibberish_answers(questions):
    return [
        {"question_id": q["id"], "answer": "xqz wibble wobble zzz"}
        for q in questions
    ]


@pytest.mark.asyncio
async def test_questionnaire_full_flow_and_claim_gate():
    """8.4-8.7: questions -> fail -> pass -> token -> claim -> linked."""
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        claimant, finder, lost, found = await _setup(session, uid)
        ids = {
            "users": [claimant.id, finder.id],
            "items": [lost.id, found.id],
        }
        pair = {"lost_item_id": lost.id, "found_item_id": found.id}

    try:
        async with _client(_token(ids["users"][0])) as client:
            # 8.5: question set for the valid pair.
            r = await client.post("/claims/questions", json=pair)
            assert r.status_code == 200
            questions = r.json()
            assert len(questions) == 7
            assert {q["category"] for q in questions} == {
                "COLOR", "MARK", "LOCATION", "CONTENTS",
                "BRAND", "MODEL", "PERSONALIZATION",
            }

            # 8.6: gibberish answers fail, no token.
            r = await client.post("/claims/answers", json={
                **pair, "answers": _gibberish_answers(questions),
            })
            assert r.status_code == 200
            assert r.json()["passed"] is False
            assert r.json()["score"] == pytest.approx(0.0)
            assert r.json()["verification_token"] is None

            # 8.6: grounded answers pass with a token.
            r = await client.post("/claims/answers", json={
                **pair, "answers": _grounded_answers(questions),
            })
            assert r.status_code == 200
            body = r.json()
            assert body["passed"] is True
            assert body["score"] == pytest.approx(1.0)
            token = body["verification_token"]
            assert token

            # 8.7: missing token rejected (422 required field).
            r = await client.post("/claims/", json=dict(pair))
            assert r.status_code == 422

            # 8.7: forged token rejected.
            r = await client.post("/claims/", json={
                **pair, "verification_token": "forged",
            })
            assert r.status_code == 403

            # 8.7: valid token creates the claim.
            r = await client.post("/claims/", json={
                **pair, "verification_token": token,
            })
            assert r.status_code == 201
            claim_id = r.json()["id"]

            # Reusing the pair now conflicts (claim already exists).
            r = await client.post("/claims/", json={
                **pair, "verification_token": token,
            })
            assert r.status_code == 409

        # 8.2/8.8: hashes stored (64-hex, never plaintext), linked.
        async with AsyncSessionLocal() as session:
            rows = (await session.execute(
                select(ClaimAnswer).where(
                    ClaimAnswer.claimant_id == ids["users"][0],
                    ClaimAnswer.claim_id == claim_id,
                )
            )).scalars().all()
            assert len(rows) == 7
            for row in rows:
                assert len(row.answer_hash) == 64
                assert row.answer_hash != "black wallet detail"
                int(row.answer_hash, 16)
    finally:
        async with AsyncSessionLocal() as session:
            await _cleanup(session, ids["users"], ids["items"])


@pytest.mark.asyncio
async def test_questionnaire_validates_pair_and_answers():
    """Pair gating (no LOST -> 403) and answer validation (400s)."""
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        claimant, finder, lost, found = await _setup(session, uid)
        ids = {
            "users": [claimant.id, finder.id],
            "items": [lost.id, found.id],
        }

    try:
        # Finder has no LOST item: questions denied with LOST_ITEM_REQUIRED.
        async with _client(_token(ids["users"][1])) as client:
            r = await client.post("/claims/questions", json={
                "lost_item_id": lost.id, "found_item_id": found.id,
            })
            # Finder doesn't own the lost item -> 404.
            assert r.status_code in (403, 404)

        async with _client(_token(ids["users"][0])) as client:
            pair = {"lost_item_id": lost.id, "found_item_id": found.id}
            questions = (await client.post(
                "/claims/questions", json=pair)).json()

            # Unknown question id.
            r = await client.post("/claims/answers", json={
                **pair, "answers": [{"question_id": 999999,
                                     "answer": "black"}],
            })
            assert r.status_code == 400

            # Duplicate question id.
            qid = questions[0]["id"]
            r = await client.post("/claims/answers", json={
                **pair, "answers": [
                    {"question_id": qid, "answer": "black"},
                    {"question_id": qid, "answer": "leather"},
                ],
            })
            assert r.status_code == 400

            # Blank answer.
            r = await client.post("/claims/answers", json={
                **pair, "answers": [{"question_id": qid, "answer": "   "}],
            })
            assert r.status_code == 400
    finally:
        async with AsyncSessionLocal() as session:
            await _cleanup(session, ids["users"], ids["items"])


@pytest.mark.asyncio
async def test_token_bound_to_pair():
    """A token for pair A cannot create a claim for pair B."""
    uid = uuid.uuid4().hex[:8]
    async with AsyncSessionLocal() as session:
        claimant, finder, lost, found = await _setup(session, uid)
        other_found = Item(
            user_id=finder.id, type=ItemType.FOUND,
            title="Another black wallet",
            description="Another black leather wallet found",
            category="Accessories", status=ItemStatus.ACTIVE,
        )
        session.add(other_found)
        await session.commit()
        await session.refresh(other_found)
        session.add(ItemEmbedding(
            item_id=other_found.id, embedding=_unit(0), model="t"))
        await session.commit()
        ids = {
            "users": [claimant.id, finder.id],
            "items": [lost.id, found.id, other_found.id],
        }

    try:
        async with _client(_token(ids["users"][0])) as client:
            pair = {"lost_item_id": lost.id, "found_item_id": found.id}
            questions = (await client.post(
                "/claims/questions", json=pair)).json()
            answers = (await client.post("/claims/answers", json={
                **pair, "answers": _grounded_answers(questions),
            })).json()
            assert answers["passed"] is True

            # Same lost, different found -> 403.
            r = await client.post("/claims/", json={
                "lost_item_id": lost.id,
                "found_item_id": other_found.id,
                "verification_token": answers["verification_token"],
            })
            assert r.status_code == 403
    finally:
        async with AsyncSessionLocal() as session:
            await _cleanup(session, ids["users"], ids["items"])
