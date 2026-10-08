"""add occurred_at to items

Revision ID: e7b3c9d52f41
Revises: d5e9f2c41a88
Create Date: 2026-10-06

Stitch screen 3: the report flow asks when the item was lost/found.
Nullable so all existing rows stay valid; the report form sends it
when the user fills the date field.

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e7b3c9d52f41'
down_revision: Union[str, Sequence[str], None] = 'd5e9f2c41a88'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'items',
        sa.Column('occurred_at', sa.DateTime(timezone=True),
                  nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('items', 'occurred_at')
