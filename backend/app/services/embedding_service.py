from google import genai
from google.genai import types

from app.config import get_settings


class EmbeddingService:

    def __init__(self):
        settings = get_settings()

        self.client = genai.Client(
            api_key=settings.gemini_api_key,
        )

        self.model = settings.gemini_embedding_model

    async def generate_item_embedding(
        self,
        *,
        description: str,
        image_bytes: bytes,
        mime_type: str,
    ) -> list[float]:

        result = self.client.models.embed_content(
            model=self.model,
            contents=[
                description,
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type=mime_type,
                ),
            ],
        )

        return result.embeddings[0].values