from arq import cron
from arq.connections import RedisSettings

from app.config import get_settings
from app.db.database import AsyncSessionLocal
from app.services.item_processing_service import (
    ItemProcessingService,
)


settings = get_settings()


async def process_item(ctx, item_id: int):
    print(f"Processing item {item_id}")

    async with AsyncSessionLocal() as db:
        service = ItemProcessingService(db)

        await service.process_item(
            item_id=item_id
        )

    print(f"Finished item {item_id}")


class WorkerSettings:
    functions = [
        process_item,
    ]

    redis_settings = RedisSettings.from_dsn(
        settings.redis_url
    )

    max_jobs = 10

    job_timeout = 300

    max_tries = 3