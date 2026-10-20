"""Database initialisation for VeriBrand AI."""

import logging
from app.db.models import Base
from app.db.session import engine

log = logging.getLogger("veribrand.db")


def init_db(use_alembic: bool = False) -> None:
    """Creates all database tables defined in Base metadata."""
    eng = engine()
    Base.metadata.create_all(eng)
    log.info("VeriBrand AI database initialized successfully.")
