"""Governance Audit Log Router for VeriBrand AI.

Provides queries over the append-only SHA-256 hash chained governance log
and cryptographic integrity validation.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import User, require
from app.db.models import GovernanceAuditRow
from app.db.session import get_db
from app.schemas import GovernanceAuditEntry
from app.workflow.audit_logger import verify_audit_chain_integrity

log = logging.getLogger("veribrand.audit_router")

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=list[GovernanceAuditEntry])
def list_audit_events(
    actor: str | None = None,
    action: str | None = None,
    target_id: str | None = None,
    limit: int = Query(100, le=500),
    user: User = Depends(require("audit.view")),
    db: Session = Depends(get_db),
):
    """Query immutable governance audit log entries in reverse chronological order."""
    stmt = select(GovernanceAuditRow)
    if actor:
        stmt = stmt.where(GovernanceAuditRow.actor_name.ilike(f"%{actor}%"))
    if action:
        stmt = stmt.where(GovernanceAuditRow.action.ilike(f"%{action}%"))
    if target_id:
        stmt = stmt.where(GovernanceAuditRow.target_id == target_id)

    return db.execute(stmt.order_by(GovernanceAuditRow.seq.desc()).limit(limit)).scalars().all()


@router.get("/verify")
def verify_audit_integrity(
    user: User = Depends(require("audit.view")),
    db: Session = Depends(get_db),
):
    """Cryptographically validates the SHA-256 hash chain to prove zero tampering."""
    return verify_audit_chain_integrity(db)
