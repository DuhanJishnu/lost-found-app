import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from arq.worker import create_worker

from app.api.items import router as items_router
from app.api.stats import router as stats_router
from app.api.storage import router as storage_router
from app.api.embeddings import router as embeddings_router
from app.api.match import router as matches_router
from app.api.notification import router as notifications_router
from app.api.auth import router as auth_router
from app.api.claims import router as claims_router
from app.api.users import router as users_router
from app.worker import WorkerSettings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan context manager.

    Starts an embedded Arq worker inside the same asyncio event loop.
    This eliminates the need for a separate paid Render Background Worker,
    enabling the entire platform to run on Render's 100% free Web Service.
    """
    worker = None
    worker_task = None

    try:
        worker = create_worker(WorkerSettings)
        worker_task = asyncio.create_task(worker.async_run())
        logger.info("Embedded Arq worker successfully started.")
    except Exception as exc:
        logger.warning("Could not start embedded Arq worker: %s", exc)

    yield

    if worker:
        try:
            await worker.close()
        except Exception:
            pass

    if worker_task:
        worker_task.cancel()


app = FastAPI(
    title="Lost & Found API",
    description="Semantic Lost & Found Matching System",
    version="0.1.0",
    lifespan=lifespan,
)


app.include_router(items_router)
app.include_router(stats_router)
app.include_router(storage_router)
app.include_router(embeddings_router)
app.include_router(matches_router)
app.include_router(notifications_router)
app.include_router(auth_router)
app.include_router(claims_router)
app.include_router(users_router)


@app.get("/")
async def root():
    return {
        "message": "Lost & Found API is running"
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy"
    }
