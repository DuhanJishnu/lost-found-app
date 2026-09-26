from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService

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