"""add claim verification questions and answers

Revision ID: d5e9f2c41a88
Revises: c42d8f1b3e55
Create Date: 2026-10-05

Phase 8.1/8.2/8.3: ClaimQuestion (category, question text) and
ClaimAnswer (SHA-256 hashes only, claim linked after creation) tables,
seeded with one question per ownership category. Questions target
details from the claimant's own LOST report — not facts derivable from
the FOUND photo (Phase 8.8 design rule).

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd5e9f2c41a88'
down_revision: Union[str, Sequence[str], None] = 'c42d8f1b3e55'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


QUESTIONS = [
    ("COLOR",
     "What color was the item, exactly as you described it in your report?"),
    ("MARK",
     "What distinguishing mark, scratch, sticker, or damage did it have?"),
    ("LOCATION",
     "Where exactly did you lose it (place, area, or landmark)?"),
    ("CONTENTS",
     "What was inside or attached to the item when you lost it?"),
    ("BRAND",
     "What brand made the item?"),
    ("MODEL",
     "What model, size, or variant was it?"),
    ("PERSONALIZATION",
     "What personalization does it have (engraving, initials, case, "
     "keychain, or other custom detail)?"),
]


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'claim_questions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(length=30), nullable=False),
        sa.Column('question', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False,
                  server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_claim_questions_category'), 'claim_questions',
                    ['category'], unique=True)
    op.create_index(op.f('ix_claim_questions_id'), 'claim_questions',
                    ['id'], unique=False)

    op.create_table(
        'claim_answers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('claimant_id', sa.Integer(), nullable=False),
        sa.Column('lost_item_id', sa.Integer(), nullable=False),
        sa.Column('found_item_id', sa.Integer(), nullable=False),
        sa.Column('question_id', sa.Integer(), nullable=False),
        sa.Column('answer_hash', sa.String(length=64), nullable=False),
        sa.Column('claim_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True),
                  server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['claim_id'], ['claims.id'],
                                ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['claimant_id'], ['users.id'],
                                ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['found_item_id'], ['items.id'],
                                ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['lost_item_id'], ['items.id'],
                                ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['question_id'], ['claim_questions.id'],
                                ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_claim_answers_claim_id'), 'claim_answers',
                    ['claim_id'], unique=False)
    op.create_index(op.f('ix_claim_answers_claimant_id'), 'claim_answers',
                    ['claimant_id'], unique=False)
    op.create_index(op.f('ix_claim_answers_found_item_id'), 'claim_answers',
                    ['found_item_id'], unique=False)
    op.create_index(op.f('ix_claim_answers_id'), 'claim_answers',
                    ['id'], unique=False)
    op.create_index(op.f('ix_claim_answers_lost_item_id'), 'claim_answers',
                    ['lost_item_id'], unique=False)
    op.create_index(op.f('ix_claim_answers_question_id'), 'claim_answers',
                    ['question_id'], unique=False)
    # One pending (unlinked) attempt per claimant/pair/question.
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS "
        "uq_claim_answers_pending_attempt "
        "ON claim_answers "
        "(claimant_id, lost_item_id, found_item_id, question_id) "
        "WHERE claim_id IS NULL"
    )

    for category, question in QUESTIONS:
        op.execute(
            sa.text(
                "INSERT INTO claim_questions (category, question) "
                "VALUES (:category, :question) "
                "ON CONFLICT (category) DO NOTHING"
            ).bindparams(category=category, question=question)
        )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP INDEX IF EXISTS uq_claim_answers_pending_attempt")
    op.drop_index(op.f('ix_claim_answers_question_id'),
                  table_name='claim_answers')
    op.drop_index(op.f('ix_claim_answers_lost_item_id'),
                  table_name='claim_answers')
    op.drop_index(op.f('ix_claim_answers_id'), table_name='claim_answers')
    op.drop_index(op.f('ix_claim_answers_found_item_id'),
                  table_name='claim_answers')
    op.drop_index(op.f('ix_claim_answers_claimant_id'),
                  table_name='claim_answers')
    op.drop_index(op.f('ix_claim_answers_claim_id'),
                  table_name='claim_answers')
    op.drop_table('claim_answers')
    op.drop_index(op.f('ix_claim_questions_id'),
                  table_name='claim_questions')
    op.drop_index(op.f('ix_claim_questions_category'),
                  table_name='claim_questions')
    op.drop_table('claim_questions')
