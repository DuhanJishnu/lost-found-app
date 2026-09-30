"""add match status

Revision ID: 7b65a23d6d5b
Revises: 19532a4047f0
Create Date: 2026-09-30 00:37:38.259656

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7b65a23d6d5b'
down_revision: Union[str, Sequence[str], None] = '19532a4047f0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    match_status = sa.Enum(
        "PENDING",
        "CONFIRMED",
        "REJECTED",
        name="matchstatus",
    )

    # Create PostgreSQL enum type first
    match_status.create(op.get_bind(), checkfirst=True)

    # Add column with temporary default for existing rows
    op.add_column(
        "matches",
        sa.Column(
            "status",
            match_status,
            nullable=False,
            server_default="PENDING",
        ),
    )

    op.create_index(
        op.f("ix_matches_status"),
        "matches",
        ["status"],
        unique=False,
    )

    # Remove default after existing rows have been populated
    op.alter_column(
        "matches",
        "status",
        server_default=None,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_matches_status"),
        table_name="matches",
    )

    op.drop_column("matches", "status")

    # Remove PostgreSQL enum type
    match_status = sa.Enum(
        "PENDING",
        "CONFIRMED",
        "REJECTED",
        name="matchstatus",
    )

    match_status.drop(op.get_bind(), checkfirst=True)