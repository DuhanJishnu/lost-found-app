import uuid

import boto3
from botocore.client import Config

from app.config import get_settings


class StorageService:

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
            ExpiresIn=300,
        )

        return upload_url, object_key