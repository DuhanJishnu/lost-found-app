from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService
from app.services.password_service import hash_password, verify_password
from app.api.dependencies import get_current_user_id

from fastapi import Depends

from app.api.internal_dependencies import (
    verify_internal_secret,
)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


class GoogleUserRequest(BaseModel):
    google_id: str
    name: str
    email: str


@router.post("/google")
async def authenticate_google_user(
    data: GoogleUserRequest,
    _: None = Depends(verify_internal_secret),
    db: AsyncSession = Depends(get_db),
):
    user_repository = UserRepository(db)

    user = await user_repository.get_by_google_id(
        data.google_id
    )

    if user is None:
        user = await user_repository.get_by_email(
            data.email
        )

    if user is None:
        user = await user_repository.create(
            google_id=data.google_id,
            name=data.name,
            email=data.email,
        )

    auth_service = AuthService()

    access_token = auth_service.create_api_token(
        user.id
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
        },
    }

@router.get("/me")
async def get_current_user(
    user_id: int = Depends(get_current_user_id),
):
    return {"user_id": user_id}


_EMAIL_RE = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=255, pattern=_EMAIL_RE)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class TokenRequest(BaseModel):
    user_id: int


def _public_user(user) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
    }


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_with_password(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Public email/password registration (no internal secret required)."""
    user_repository = UserRepository(db)

    existing = await user_repository.get_by_email(data.email)

    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = await user_repository.create(
        name=data.name.strip(),
        email=data.email.strip().lower(),
        password_hash=hash_password(data.password),
    )

    return {"user": _public_user(user)}


@router.post("/login")
async def login_with_password(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Public email/password login (no internal secret required)."""
    user_repository = UserRepository(db)

    user = await user_repository.get_by_email(data.email.strip().lower())

    if user is None or user.password_hash is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return {"user": _public_user(user)}


@router.post("/token")
async def mint_user_token(
    data: TokenRequest,
    _: None = Depends(verify_internal_secret),
    db: AsyncSession = Depends(get_db),
):
    """Mint a backend API token for a user id.

    Internal only: called by the Next.js server for sessions that did
    not come from Google (e.g. email/password via NextAuth credentials).
    """
    user_repository = UserRepository(db)

    user = await user_repository.get_by_id(data.user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    auth_service = AuthService()

    return {
        "access_token": auth_service.create_api_token(user.id),
        "token_type": "bearer",
        "user": _public_user(user),
    }