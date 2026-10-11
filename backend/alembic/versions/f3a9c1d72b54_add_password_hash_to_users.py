"""add password hash to users

Revision ID: f3a9c1d72b54
Revises: e7b3c9d52f41
Create Date: 2026-10-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3a9c1d72b54'
down_revision: Union[str, Sequence[str], None] = 'e7b3c9d52f41'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('password_hash', sa.String(length=255), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'password_hash')
