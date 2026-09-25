from arq import create_pool
from arq.connections import RedisSettings

from app.config import get_settings


settings = get_settings()


async def get_queue():
    return await create_pool(
        RedisSettings.from_dsn(
            settings.redis_url
        )
    )


async def enqueue_item_processing(
    item_id: int,
):
    queue = await get_queue()

    await queue.enqueue_job(
        "process_item",
        item_id,
    )

    await queue.close()