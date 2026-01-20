"""add_supplier_id_to_block_requests

Revision ID: 58e7c49d5450
Revises: 0bd6075d08ac
Create Date: 2026-01-20 22:05:00.640984

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '58e7c49d5450'
down_revision: Union[str, Sequence[str], None] = '0bd6075d08ac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('block_requests', schema=None) as batch_op:
        batch_op.add_column(sa.Column('supplier_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_block_requests_supplier_id', 'production_materials', ['supplier_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('block_requests', schema=None) as batch_op:
        batch_op.drop_constraint('fk_block_requests_supplier_id', type_='foreignkey')
        batch_op.drop_column('supplier_id')
