from pydantic import BaseModel, Field


class ImageVerificationRequest(BaseModel):
    """Request body for verifying image against user-provided details."""

    image_key: str = Field(
        min_length=1,
        max_length=500,
        description="R2 object key of the uploaded image to verify.",
    )

    title: str = Field(
        min_length=2,
        max_length=200,
    )

    description: str = Field(
        min_length=5,
        max_length=5000,
    )

    category: str = Field(
        min_length=2,
        max_length=100,
    )


class ImageVerificationMismatch(BaseModel):
    field: str
    user_said: str
    image_shows: str
    severity: str = "high"


class ImageVerificationResponse(BaseModel):
    match: bool
    mismatches: list[ImageVerificationMismatch] = Field(
        default_factory=list,
    )
    suggested_title: str | None = None
    suggested_description: str | None = None
    suggested_category: str | None = None
