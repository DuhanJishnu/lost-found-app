from fastapi import FastAPI
from sqlalchemy import text

from app.db.database import AsyncSessionLocal



app = FastAPI(
    title="Lost & Found API",
    description="Semantic Lost & Found Matching System",
    version="0.1.0",
)

@app.get("/")
def root():
    return {
        "message": "Lost & Found API is running"
    }


@app.get("/health")
async def health():
    async with AsyncSessionLocal() as session:
        result = await session.execute(text("SELECT 1"))

    return {
        "status": "healthy",
        "database": result.scalar() == 1,
    }