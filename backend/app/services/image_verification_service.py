import asyncio
import json
import logging

from google import genai
from google.genai import types

from app.config import get_settings
from app.services.storage_service import StorageService

logger = logging.getLogger(__name__)


class ImageVerificationResult:
    """Result of verifying user-provided details against an uploaded image."""

    def __init__(
        self,
        *,
        match: bool,
        mismatches: list[dict],
        suggested_title: str | None = None,
        suggested_description: str | None = None,
        suggested_category: str | None = None,
    ):
        self.match = match
        self.mismatches = mismatches
        self.suggested_title = suggested_title
        self.suggested_description = suggested_description
        self.suggested_category = suggested_category

    def to_dict(self) -> dict:
        return {
            "match": self.match,
            "mismatches": self.mismatches,
            "suggested_title": self.suggested_title,
            "suggested_description": self.suggested_description,
            "suggested_category": self.suggested_category,
        }


class ImageVerificationService:
    """Uses Gemini vision to verify item details against uploaded images.

    Only flags MAJOR discrepancies — wrong object type, clearly wrong
    colour, wrong brand name, wrong shape. Minor or ambiguous differences
    (e.g. "navy" vs "dark blue", slight shade variations) are ignored.
    """

    VERIFICATION_MODEL = "gemini-3.8-flash"

    SYSTEM_PROMPT = """\
You are an image verification assistant for a lost-and-found application.

Your job: compare the uploaded image against the user-provided item details
and detect MAJOR factual mismatches ONLY.

Flag a mismatch ONLY when there is a clear, obvious contradiction such as:
- Object type is wrong (e.g. user says "wallet" but image shows a phone)
- Colour is clearly wrong (e.g. user says "red" but item is purple/blue/black)
- Brand name is clearly wrong (e.g. user says "Apple" or "iPhone" but device is clearly Samsung)
- Shape/form factor is obviously wrong (e.g. user says "backpack" but image shows a handbag)
- Category is clearly wrong (e.g. user says "Jewelry" but image shows electronics)

DO NOT flag:
- Minor shade/tone differences (navy vs dark blue, cream vs white, maroon vs dark red)
- Subjective or ambiguous differences
- Details not visible in the image (internal serial number, memory size, features hidden under a case)
- Differences in phrasing that mean the same thing

Respond with ONLY a valid JSON object matching this schema:
{
  "match": true or false,
  "mismatches": [
    {
      "field": "color" or "object_type" or "brand" or "shape" or "category",
      "user_said": "what the user claimed in their details",
      "image_shows": "what is clearly visible in the image",
      "severity": "high"
    }
  ],
  "suggested_title": "if mismatches exist, a corrected concise title for the item visible in the image; otherwise null",
  "suggested_description": "if mismatches exist, a corrected description incorporating the image reality while preserving truthful user details; otherwise null",
  "suggested_category": "if category mismatch exists, one of: Electronics, Keys, Wallets, Bags, IDs & Cards, Jewelry, Accessories, Clothing, Documents, Other; otherwise null"
}

If everything matches or differences are minor/ambiguous, return:
{"match": true, "mismatches": [], "suggested_title": null, "suggested_description": null, "suggested_category": null}
"""

    def __init__(self):
        settings = get_settings()

        self.client = genai.Client(
            api_key=settings.gemini_api_key,
        )

        self.storage = StorageService()

    async def verify_image_against_details(
        self,
        *,
        image_key: str,
        title: str,
        description: str,
        category: str,
    ) -> ImageVerificationResult:
        """Download image from R2 and ask Gemini to check for major mismatches."""

        image_bytes, mime_type = self.storage.get_object(
            object_key=image_key,
        )

        user_details = (
            f"Title: {title}\n"
            f"Category: {category}\n"
            f"Description: {description}"
        )

        prompt = (
            "Here is the image the user uploaded for their lost/found item report.\n\n"
            "The user provided these details:\n"
            f"{user_details}\n\n"
            "Analyse the image and compare it against these details. "
            "Flag ONLY major, obvious mismatches as instructed."
        )

        result = await asyncio.to_thread(
            self.client.models.generate_content,
            model=self.VERIFICATION_MODEL,
            contents=[
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type=mime_type,
                ),
                prompt,
            ],
            config=types.GenerateContentConfig(
                system_instruction=self.SYSTEM_PROMPT,
                temperature=0.1,
                response_mime_type="application/json",
                max_output_tokens=1024,
            ),
        )

        return self._parse_response(result.text)

    @staticmethod
    def _parse_response(text: str) -> ImageVerificationResult:
        """Parse the JSON response from Gemini."""

        cleaned = text.strip()

        if cleaned.startswith("```"):
            first_newline = cleaned.index("\n")
            cleaned = cleaned[first_newline + 1 :]

            if cleaned.endswith("```"):
                cleaned = cleaned[: -3].strip()

        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            logger.warning(f"Could not parse Gemini JSON response: {text} - {exc}")
            return ImageVerificationResult(
                match=True,
                mismatches=[],
            )

        return ImageVerificationResult(
            match=data.get("match", True),
            mismatches=data.get("mismatches", []),
            suggested_title=data.get("suggested_title"),
            suggested_description=data.get("suggested_description"),
            suggested_category=data.get("suggested_category"),
        )
