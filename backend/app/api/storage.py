from fastapi import APIRouter, Depends

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
    storage: StorageService = Depends(
        get_storage_service
    ),
):
    download_url = storage.generate_download_url(
        object_key=data.object_key,
    )

    return DownloadUrlResponse(
        download_url=download_url,
    )