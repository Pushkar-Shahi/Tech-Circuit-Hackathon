"""Approval Workflow State Machine for VeriBrand AI.

Enforces role-based permissions and state transitions:
Draft -> Scanning -> Needs Revision / Pending Manager / Pending Specialist -> Approved -> Published.
"""

from __future__ import annotations

import logging
import uuid
from typing import Literal

from sqlalchemy.orm import Session

from app.core.auth import User
from app.core.errors import ApiError, forbidden
from app.db.models import AuditFindingRow, CampaignRevisionRow, CampaignRow, FindingOverrideRow, utcnow
from app.workflow.audit_logger import log_governance_event

log = logging.getLogger("veribrand.workflow")

VALID_TRANSITIONS = {
    "draft": {"scanning"},
    "scanning": {"needs_revision", "pending_manager", "pending_specialist", "approved"},
    "needs_revision": {"scanning", "pending_manager"},
    "pending_manager": {"approved", "needs_revision", "pending_specialist"},
    "pending_specialist": {"approved", "needs_revision"},
    "approved": {"published", "needs_revision"},
    "published": set(),
}


def transition_campaign_status(
    db: Session,
    campaign_id: str,
    target_status: Literal["needs_revision", "pending_manager", "pending_specialist", "approved", "published"],
    user: User,
    reason: str = "",
) -> CampaignRow:
    """Transitions campaign status while enforcing role permissions."""
    campaign = db.get(CampaignRow, campaign_id)
    if not campaign:
        raise ApiError(404, "not_found", f"Campaign {campaign_id} not found")

    current = campaign.status
    if target_status not in VALID_TRANSITIONS.get(current, set()):
        raise ApiError(400, "invalid_transition", f"Cannot transition from '{current}' to '{target_status}'")

    # Enforce Role Permissions
    if target_status == "approved":
        if not user.can("campaign.approve"):
            raise forbidden(user.role, "campaign.approve")
    elif target_status == "published":
        if not user.can("campaign.publish"):
            raise forbidden(user.role, "campaign.publish")
    elif target_status == "pending_specialist":
        if not user.can("campaign.escalate"):
            raise forbidden(user.role, "campaign.escalate")

    prev_status = campaign.status
    campaign.status = target_status
    campaign.updated_at = utcnow()
    db.commit()

    # Log in immutable audit chain
    log_governance_event(
        db=db,
        actor_name=user.name,
        actor_role=user.role,
        action=f"campaign.transition.{target_status}",
        target_type="campaign",
        target_id=campaign_id,
        before_state={"status": prev_status},
        after_state={"status": target_status, "reason": reason},
    )

    return campaign


def submit_override_request(
    db: Session,
    campaign_id: str,
    finding_id: str,
    justification: str,
    user: User,
) -> FindingOverrideRow:
    """Creator submits an override request with mandatory justification."""
    if not justification or len(justification.strip()) < 10:
        raise ApiError(400, "invalid_justification", "A detailed justification (min 10 characters) is required to request an override.")

    finding = db.get(AuditFindingRow, finding_id)
    if not finding:
        raise ApiError(404, "not_found", f"Finding {finding_id} not found")

    override_id = f"OVR-{uuid.uuid4().hex[:8].upper()}"
    override = FindingOverrideRow(
        id=override_id,
        finding_id=finding_id,
        campaign_id=campaign_id,
        rule_id=finding.rule_id,
        requested_by=user.name,
        justification=justification.strip(),
        status="pending",
        created_at=utcnow(),
    )
    db.add(override)

    # Route campaign to pending_manager
    campaign = db.get(CampaignRow, campaign_id)
    if campaign:
        campaign.status = "pending_manager"
        campaign.updated_at = utcnow()

    db.commit()

    log_governance_event(
        db=db,
        actor_name=user.name,
        actor_role=user.role,
        action="override.request",
        target_type="override",
        target_id=override_id,
        before_state={"findingId": finding_id, "status": "open"},
        after_state={"overrideId": override_id, "justification": justification, "status": "pending"},
    )

    return override


def decide_override(
    db: Session,
    override_id: str,
    approve: bool,
    decision_note: str,
    user: User,
) -> FindingOverrideRow:
    """Manager or Specialist approves or rejects an override request."""
    if not user.can("override.decide"):
        raise forbidden(user.role, "override.decide")

    override = db.get(FindingOverrideRow, override_id)
    if not override:
        raise ApiError(404, "not_found", f"Override {override_id} not found")

    override.status = "approved" if approve else "rejected"
    override.decided_by = user.name
    override.decision_note = decision_note
    override.decided_at = utcnow()

    finding = db.get(AuditFindingRow, override.finding_id)
    if finding:
        finding.status = "overridden" if approve else "open"
        finding.updated_at = utcnow()

    db.commit()

    log_governance_event(
        db=db,
        actor_name=user.name,
        actor_role=user.role,
        action="override.approve" if approve else "override.reject",
        target_type="override",
        target_id=override_id,
        before_state={"status": "pending"},
        after_state={"status": override.status, "decidedBy": user.name, "decisionNote": decision_note},
    )

    return override
