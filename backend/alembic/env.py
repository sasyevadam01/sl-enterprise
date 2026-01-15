from logging.config import fileConfig
import os
import sys
from dotenv import load_dotenv

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# ADDED: Add parent dir to path to import models
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# ADDED: Load env vars
load_dotenv()

# ADDED: Import Base and Models
# Importing from database.py ensures all models are imported and registered in metadata
from database import Base 
# (database.py already imports all models from models/* pkg)

config = context.config

# ADDED: Overwrite sqlalchemy.url with env var
db_url = os.getenv("DATABASE_URL", "sqlite:///./sl_enterprise.db")
config.set_main_option("sqlalchemy.url", db_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # ADDED: For SQLite
        render_as_batch=True
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    
    # ADDED: Special handling for SQLite
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            # ADDED: For SQLite table modification support
            render_as_batch=True
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
