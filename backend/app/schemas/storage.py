from pydantic import BaseModel, Field


class UploadUrlRequest(BaseModel):
    content_type: str = Field(
        pattern=r"^image/(jpeg|png|webp)$"
    )


class UploadUrlResponse(BaseModel):
    upload_url: str
    object_key: str