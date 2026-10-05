"""add HNSW index on item_embeddings.embedding

Revision ID: b81f4c2e9a17
Revises: a70c431c01e9
Create Date: 2026-10-05

Phase 4.7: accelerate pgvector nearest-neighbor queries used by the FOUND
feed (search_found_candidates) and automatic matching (search_similar_items).
HNSW with cosine ops matches the cosine_distance queries used in code.
Safe on small tables — index builds immediately.

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'b81f4c2e9a17'
down_revision: Union[str, Sequence[str], None] = 'a70c431c01e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_item_embeddings_embedding_hnsw "
        "ON item_embeddings USING hnsw (embedding vector_cosine_ops)"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        "DROP INDEX IF EXISTS ix_item_embeddings_embedding_hnsw"
    )
