from fastapi import APIRouter, Depends

from app.schemas.storage import (
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