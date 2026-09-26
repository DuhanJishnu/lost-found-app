from fastapi import APIRouter

from app.services.auth_service import AuthService


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)

# temp dev code
@router.post("/dev-token/{user_id}")
async def create_dev_token(
    user_id: int,
):
    auth_service = AuthService()

    token = auth_service.create_api_token(
        user_id
    )

    return {
        "access_token": token,
        "token_type": "bearer",
    }

from fastapi import Depends

from app.api.dependencies import get_current_user_id


@router.get("/me")
async def get_me(
    user_id: int = Depends(get_current_user_id),
):
    return {
        "user_id": user_id,
    }