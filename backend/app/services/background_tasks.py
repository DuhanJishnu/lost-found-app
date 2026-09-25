from app.db.database import AsyncSessionLocal
from app.services.item_processing_service import (
    ItemProcessingService,
)


async def process_item_background(item_id: int):
    async with AsyncSessionLocal() as db:
        service = ItemProcessingService(db)

        await service.process_item(
            item_id=item_id
        )