"""add unique constraint on matches lost found

Revision ID: a70c431c01e9
Revises: 3c98c0f9b74c
Create Date: 2026-10-04 08:11:27.822074

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a70c431c01e9'
down_revision: Union[str, Sequence[str], None] = '3c98c0f9b74c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_unique_constraint('uq_matches_lost_found', 'matches', ['lost_item_id', 'found_item_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('uq_matches_lost_found', 'matches', type_='unique')
