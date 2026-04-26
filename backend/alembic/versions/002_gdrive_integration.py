"""Add Google Drive fields to users and secure_files

Revision ID: 002_gdrive_integration
Revises: 001_initial
Create Date: 2026-04-26 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '002_gdrive_integration'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add Google Drive token + folder fields to users table
    op.add_column('users', sa.Column('gdrive_token', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('gdrive_folder_id', sa.String(length=255), nullable=True))

    # Add storage tracking fields to secure_files table
    op.add_column('secure_files', sa.Column('gdrive_file_id', sa.String(length=255), nullable=True))
    op.add_column('secure_files', sa.Column('storage_location', sa.String(length=20), server_default='database', nullable=True))

    # Make encrypted_content nullable (files stored in GDrive won't have local content)
    op.alter_column('secure_files', 'encrypted_content', existing_type=sa.Text(), nullable=True)


def downgrade() -> None:
    op.alter_column('secure_files', 'encrypted_content', existing_type=sa.Text(), nullable=False)
    op.drop_column('secure_files', 'storage_location')
    op.drop_column('secure_files', 'gdrive_file_id')
    op.drop_column('users', 'gdrive_folder_id')
    op.drop_column('users', 'gdrive_token')
