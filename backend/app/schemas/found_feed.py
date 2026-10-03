from pydantic import BaseModel, Field

class FoundFeedImageResponse(BaseModel):
    id: int
    image_url: str

class FoundFeedItemResponse(BaseModel):
    id: int
    title: str
    description: str
    category: str

    similarity_score: float = Field(ge=0, le=1)

    can_view_image: bool
    can_claim: bool

    images: list[FoundFeedImageResponse] = Field(default_factory=list)

class FoundItemDetailResponse(BaseModel):
    id: int
    title: str
    description: str
    category: str

    similarity_score: float = Field(ge=0, le=1)

    can_view_image: bool
    can_claim: bool

    images: list[FoundFeedImageResponse] = Field(default_factory=list)