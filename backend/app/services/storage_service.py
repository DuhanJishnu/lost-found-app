import uuid

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.config import get_settings


class StorageService:
    """Private-bucket presigned URL issuer.

    Security invariant (Phase 6.3): this class performs NO authorization
    itself. Every signed-URL call site MUST enforce ownership first:
      - download URLs: ItemImage -> Item -> user_id check
        (api/storage.py) or the 40% similarity gate (found_feed_service).
      - upload URLs: authenticated caller only (api/storage.py).
      - worker-internal reads (get_object/head_object): server-side only,
        never exposed to clients.
    Raw R2 object keys must never be sent to clients except the key owner
    (ItemResponse.images) or the uploader receiving their own fresh key.

    Expiry (Phase 6.4): all presigned URLs live SIGNED_URL_TTL_SECONDS.
    Clients treat image URLs as single-use, short-lived values and
    re-request them per view (the frontend resolves fresh URLs on every
    server render); on expiry, re-request instead of caching.
    """

    SIGNED_URL_TTL_SECONDS = 300

    def __init__(self):
        settings = get_settings()

        self.bucket_name = settings.r2_bucket_name

        self.client = boto3.client(
            "s3",
            endpoint_url=(
                f"https://{settings.r2_account_id}"
                ".r2.cloudflarestorage.com"
            ),
            aws_access_key_id=settings.r2_access_key_id,
            aws_secret_access_key=settings.r2_secret_access_key,
            region_name="auto",
            config=Config(signature_version="s3v4"),
        )

    def generate_upload_url(
        self,
        *,
        content_type: str,
        folder: str = "items",
    ) -> tuple[str, str]:

        extension = content_type.split("/")[-1]

        object_key = (
            f"{folder}/"
            f"{uuid.uuid4()}.{extension}"
        )

        upload_url = self.client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": self.bucket_name,
                "Key": object_key,
                "ContentType": content_type,
            },
            ExpiresIn=self.SIGNED_URL_TTL_SECONDS,
        )

        return upload_url, object_key

    def generate_download_url(
        self,
        *,
        object_key: str,
    ) -> str:

        download_url = self.client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": self.bucket_name,
                "Key": object_key,
            },
            ExpiresIn=self.SIGNED_URL_TTL_SECONDS,
        )

        return download_url

    def head_object(
        self,
        *,
        object_key: str,
    ) -> dict | None:
        """Return R2 metadata for object_key, or None if it doesn't exist.

        Used to validate image_keys at item-creation time without
        downloading the object.
        """
        try:
            response = self.client.head_object(
                Bucket=self.bucket_name,
                Key=object_key,
            )
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") in (
                "404",
                "NoSuchKey",
                "NotFound",
            ):
                return None
            raise

        return response

    def get_object(
        self,
        *,
        object_key: str,
    ) -> tuple[bytes, str]:

        response = self.client.get_object(
            Bucket=self.bucket_name,
            Key=object_key,
        )

        image_bytes = response["Body"].read()
        content_type = response.get(
            "ContentType",
            "image/jpeg",
        )

        return image_bytes, content_type