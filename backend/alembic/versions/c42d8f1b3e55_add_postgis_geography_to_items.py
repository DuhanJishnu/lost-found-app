"""add PostGIS geography column to items

Revision ID: c42d8f1b3e55
Revises: b81f4c2e9a17
Create Date: 2026-10-05

Phase 7.1/7.2: enable PostGIS and add a GENERATED ALWAYS STORED
geography(Point, 4326) column derived from latitude/longitude, so it is
always in sync with zero application writes. Existing rows are
backfilled automatically by Postgres. A GIST index accelerates
ST_DWithin radius filters used by the FOUND feed.

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'c42d8f1b3e55'
down_revision: Union[str, Sequence[str], None] = 'b81f4c2e9a17'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute(
        "ALTER TABLE items ADD COLUMN IF NOT EXISTS geog "
        "geography(Point, 4326) GENERATED ALWAYS AS ("
        "CASE WHEN latitude IS NULL OR longitude IS NULL THEN NULL "
        "ELSE ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)"
        "::geography END"
        ") STORED"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_items_geog "
        "ON items USING gist (geog)"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP INDEX IF EXISTS ix_items_geog")
    op.execute("ALTER TABLE items DROP COLUMN IF EXISTS geog")
    # NOTE: the postgis extension is intentionally left installed.
