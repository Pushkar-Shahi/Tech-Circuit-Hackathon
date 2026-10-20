"""Cryptographically Linked Append-Only Governance Audit Logger.

Enforces a tamper-evident SHA-256 hash chain where every governance event
(rule creation, scan, rewrite acceptance, override, approval, publication)
is linked to the hash of the preceding entry.
"""

from __future__ import annotations

import hashlib
import json
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import GovernanceAuditRow, utcnow

GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"


def log_governance_event(
    db: Session,
    actor_name: str,
    actor_role: str,
    action: str,
    target_type: str,
    target_id: str,
    before_state: Any = None,
    after_state: Any = None,
) -> GovernanceAuditRow:
    """Appends an immutable audit entry into the hash chain."""
    last_entry = db.execute(select(GovernanceAuditRow).order_by(GovernanceAuditRow.seq.desc()).limit(1)).scalar_one_or_none()
    prev_hash = last_entry.hash if last_entry else GENESIS_HASH

    ts = utcnow()
    event_id = f"EVT-{uuid.uuid4().hex[:8].upper()}"

    # Calculate SHA-256 digest
    payload = f"{prev_hash}|{ts}|{actor_name}|{actor_role}|{action}|{target_type}|{target_id}|{json.dumps(after_state, sort_keys=True, default=str)}"
    entry_hash = hashlib.sha256(payload.encode("utf-8")).hexdigest()

    row = GovernanceAuditRow(
        id=event_id,
        ts=ts,
        actor_name=actor_name,
        actor_role=actor_role,
        action=action,
        target_type=target_type,
        target_id=target_id,
        before_state=before_state,
        after_state=after_state,
        prev_hash=prev_hash,
        hash=entry_hash,
    )
    db.add(row)
    db.commit()
    return row


def verify_audit_chain_integrity(db: Session) -> dict[str, Any]:
    """Validates the entire cryptographic SHA-256 chain to guarantee zero tampering."""
    entries = db.execute(select(GovernanceAuditRow).order_by(GovernanceAuditRow.seq.asc())).scalars().all()
    if not entries:
        return {"valid": True, "count": 0, "message": "Audit chain is empty and valid."}

    prev_hash = GENESIS_HASH
    for e in entries:
        if e.prev_hash != prev_hash:
            return {
                "valid": False,
                "brokenAtSeq": e.seq,
                "expectedPrevHash": prev_hash,
                "actualPrevHash": e.prev_hash,
                "message": f"Cryptographic break detected at sequence {e.seq}!",
            }

        payload = f"{prev_hash}|{e.ts}|{e.actor_name}|{e.actor_role}|{e.action}|{e.target_type}|{e.target_id}|{json.dumps(e.after_state, sort_keys=True, default=str)}"
        expected_hash = hashlib.sha256(payload.encode("utf-8")).hexdigest()
        if e.hash != expected_hash:
            return {
                "valid": False,
                "brokenAtSeq": e.seq,
                "message": f"Tampering detected: hash mismatch at sequence {e.seq}!",
            }
        prev_hash = e.hash

    return {
        "valid": True,
        "count": len(entries),
        "latestHash": prev_hash,
        "message": f"All {len(entries)} governance events cryptographically verified.",
    }
