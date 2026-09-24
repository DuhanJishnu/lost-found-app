from pydantic import BaseModel


class GenerateEmbeddingResponse(BaseModel):
    item_id: int
    embedding_id: int
    dimension: int
    model: str