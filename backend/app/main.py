from fastapi import FastAPI

from app.api.items import router as items_router


app = FastAPI(
    title="Lost & Found API",
    description="Semantic Lost & Found Matching System",
    version="0.1.0",
)


app.include_router(items_router)


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