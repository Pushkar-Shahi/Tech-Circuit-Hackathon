"""Admin router for VeriBrand AI."""

from __future__ import annotations

import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import User, current_user
from app.core.errors import forbidden
from app.db.models import Base
from app.db.session import engine, get_db

log = logging.getLogger("veribrand.admin")

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(user: User = Depends(current_user)) -> User:
    if user.role not in ("admin", "owner"):
        raise forbidden(user.role, "admin.reset")
    return user


@router.post("/reset-demo")
def reset_demo_data(
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Resets and repopulates the entire demo dataset for Acme Cloud Enterprise."""
    log.info("Admin %s requested demo data reset", user.name)

    eng = engine()
    with eng.begin() as conn:
        if eng.dialect.name == "sqlite":
            conn.exec_driver_sql("PRAGMA foreign_keys = OFF;")
            conn.exec_driver_sql("DROP TRIGGER IF EXISTS audit_no_delete;")
            conn.exec_driver_sql("DROP TRIGGER IF EXISTS audit_no_update;")

    Base.metadata.drop_all(eng)
    Base.metadata.create_all(eng)

    # Call seed_demo_data to repopulate all demo entities
    from scripts.seed_demo import seed_demo_data
    seed_demo_data()

    log.info("Demo data reset completed successfully")
    return {"status": "ok", "message": "Demo data reset successfully"}
