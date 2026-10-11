from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user_id
from app.db.database import get_db
from app.schemas.stats import CommunityStatsResponse
from app.services.community_stats_service import CommunityStatsService

router = APIRouter(
    prefix="/stats",
    tags=["Statistics"],
)


@router.get(
    "/community",
    response_model=CommunityStatsResponse,
)
async def get_community_stats(
    _: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await CommunityStatsService(db).get_stats()
