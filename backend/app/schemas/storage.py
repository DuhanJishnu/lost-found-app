from pydantic import BaseModel, Field


class UploadUrlRequest(BaseModel):
    content_type: str = Field(
        pattern=r"^image/(jpeg|png|webp)$"
    )


class UploadUrlResponse(BaseModel):
    upload_url: str
    object_key: str


class DownloadUrlRequest(BaseModel):
    object_key: str = Field(
        min_length=1,
        max_length=500,
    )


class DownloadUrlResponse(BaseModel):
    download_url: str