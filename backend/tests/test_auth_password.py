"""Email/password auth API tests (POST /auth/register, /auth/login, /auth/token)."""

import uuid

import httpx
import pytest
from sqlalchemy import delete

from app.config import get_settings
from app.db.database import AsyncSessionLocal
from app.main import app
from app.models.user import User
from app.services.password_service import hash_password, verify_password


def _client(headers=None):
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
        headers=headers or {},
    )


def _internal_headers():
    return {"X-Internal-Secret": get_settings().internal_api_secret}


async def _cleanup(session, user_ids):
    await session.execute(delete(User).where(User.id.in_(user_ids)))
    await session.commit()


def _creds(tag: str):
    uid = uuid.uuid4().hex[:8]
    return {
        "name": f"Pwd User {uid}",
        "email": f"pwd_{tag}_{uid}@example.com",
        "password": "S3cure!Passw0rd",
    }


def test_password_hash_roundtrip():
    hashed = hash_password("S3cure!Passw0rd")
    assert hashed != "S3cure!Passw0rd"
    assert verify_password("S3cure!Passw0rd", hashed) is True
    assert verify_password("wrong-password", hashed) is False
    assert verify_password("S3cure!Passw0rd", "not-a-hash") is False


@pytest.mark.asyncio
async def test_register_then_login_flow():
    creds = _creds("flow")
    user_ids = []
    try:
        async with _client() as client:
            response = await client.post("/auth/register", json=creds)
            assert response.status_code == 201, response.text
            body = response.json()
            assert body["user"]["email"] == creds["email"].lower()
            assert "password" not in body["user"]
            user_ids.append(body["user"]["id"])

            # Duplicate registration conflicts.
            response = await client.post("/auth/register", json=creds)
            assert response.status_code == 409

            # Correct credentials log in.
            response = await client.post(
                "/auth/login",
                json={"email": creds["email"], "password": creds["password"]},
            )
            assert response.status_code == 200, response.text
            assert response.json()["user"]["id"] == user_ids[0]

            # Wrong password is rejected without saying which part failed.
            response = await client.post(
                "/auth/login",
                json={"email": creds["email"], "password": "wrong-password"},
            )
            assert response.status_code == 401
            assert response.json()["detail"] == "Invalid email or password"

            # Unknown email gets the same generic rejection.
            response = await client.post(
                "/auth/login",
                json={
                    "email": f"nobody_{uuid.uuid4().hex[:8]}@example.com",
                    "password": "whatever123",
                },
            )
            assert response.status_code == 401
    finally:
        async with AsyncSessionLocal() as session:
            await _cleanup(session, user_ids)


@pytest.mark.asyncio
async def test_register_validation():
    async with _client() as client:
        # Short password rejected.
        response = await client.post(
            "/auth/register",
            json={"name": "A", "email": "a@example.com", "password": "short"},
        )
        assert response.status_code == 422

        # Malformed email rejected.
        response = await client.post(
            "/auth/register",
            json={
                "name": "A",
                "email": "not-an-email",
                "password": "S3cure!Passw0rd",
            },
        )
        assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_google_only_user_rejected():
    uid = uuid.uuid4().hex[:8]
    user_ids = []
    try:
        async with AsyncSessionLocal() as session:
            user = User(
                name=f"Google_{uid}",
                email=f"google_{uid}@example.com",
                google_id=f"google-{uid}",
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            user_ids.append(user.id)

        async with _client() as client:
            response = await client.post(
                "/auth/login",
                json={"email": f"google_{uid}@example.com", "password": "x" * 10},
            )
            assert response.status_code == 401
    finally:
        async with AsyncSessionLocal() as session:
            await _cleanup(session, user_ids)


@pytest.mark.asyncio
async def test_token_minting_requires_internal_secret():
    creds = _creds("token")
    user_ids = []
    try:
        async with _client() as client:
            response = await client.post("/auth/register", json=creds)
            assert response.status_code == 201, response.text
            user_id = response.json()["user"]["id"]
            user_ids.append(user_id)

            # No secret -> rejected.
            response = await client.post("/auth/token", json={"user_id": user_id})
            assert response.status_code == 401

            # Correct secret -> token minted.
            async with _client(_internal_headers()) as authed:
                response = await authed.post(
                    "/auth/token", json={"user_id": user_id}
                )
                assert response.status_code == 200, response.text
                assert response.json()["access_token"]

                # Unknown user -> 404.
                response = await authed.post(
                    "/auth/token", json={"user_id": 2**31 - 1}
                )
                assert response.status_code == 404
    finally:
        async with AsyncSessionLocal() as session:
            await _cleanup(session, user_ids)
