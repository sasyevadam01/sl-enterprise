"""add preparing status columns to logistics_requests

Revision ID: a8f2c1d3e456
Revises: 0bd6075d08ac
Create Date: 2026-02-23 16:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a8f2c1d3e456'
down_revision: str = '0bd6075d08ac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('logistics_requests', sa.Column('prepared_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True))
    op.add_column('logistics_requests', sa.Column('prepared_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('logistics_requests', 'prepared_at')
    op.drop_column('logistics_requests', 'prepared_by_id')
