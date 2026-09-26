from fastapi import FastAPI

from app.api.items import router as items_router
from app.api.storage import router as storage_router
from app.api.embeddings import router as embeddings_router
from app.api.match import router as matches_router
from app.api.notification import router as notifications_router

app = FastAPI(
    title="Lost & Found API",
    description="Semantic Lost & Found Matching System",
    version="0.1.0",
)


app.include_router(items_router)
app.include_router(storage_router)
app.include_router(embeddings_router)
app.include_router(matches_router)
app.include_router(notifications_router)


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