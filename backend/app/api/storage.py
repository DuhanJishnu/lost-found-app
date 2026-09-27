from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user_id
from app.db.database import get_db
from app.repositories.item_repository import ItemRepository

from app.schemas.storage import (
    DownloadUrlRequest,
    DownloadUrlResponse,
    UploadUrlRequest,
    UploadUrlResponse,
)
from app.services.storage_service import StorageService


router = APIRouter(
    prefix="/storage",
    tags=["Storage"],
)


def get_storage_service() -> StorageService:
    return StorageService()


@router.post(
    "/upload-url",
    response_model=UploadUrlResponse,
)
async def create_upload_url(
    data: UploadUrlRequest,
    storage: StorageService = Depends(
        get_storage_service
    ),
):
    upload_url, object_key = (
        storage.generate_upload_url(
            content_type=data.content_type,
        )
    )

    return UploadUrlResponse(
        upload_url=upload_url,
        object_key=object_key,
    )

@router.post(
    "/download-url",
    response_model=DownloadUrlResponse,
)
async def create_download_url(
    data: DownloadUrlRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
    storage: StorageService = Depends(
        get_storage_service
    ),
):
    item_repository = ItemRepository(db)

    image = await item_repository.get_image_for_user(
        object_key=data.object_key,
        user_id=user_id,
    )

    if image is None:
        raise HTTPException(
            status_code=404,
            detail="Image not found",
        )

    download_url = storage.generate_download_url(
        object_key=data.object_key,
    )

    return DownloadUrlResponse(
        download_url=download_url,
    )