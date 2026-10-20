"""Manager & Specialist Review Queue Router for VeriBrand AI."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import User, current_user, require
from app.core.errors import ApiError
from app.db.models import (
    AuditFindingRow,
    CampaignRevisionRow,
    CampaignRow,
    FindingOverrideRow,
    utcnow,
)
from app.db.session import get_db
from app.schemas import Campaign, FindingOverride
from app.workflow.state_machine import decide_override, transition_campaign_status

log = logging.getLogger("veribrand.queue_router")

router = APIRouter(prefix="/queue", tags=["queue"])


class OverrideDecisionRequest(BaseModel):
    approve: bool
    decision_note: str = ""


@router.get("")
def get_review_queue(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all campaigns and override requests requiring manager or specialist action."""
    # Pending campaigns
    pending_campaigns_rows = (
        db.execute(
            select(CampaignRow)
            .where(CampaignRow.status.in_(["pending_manager", "pending_specialist", "needs_revision"]))
            .order_by(CampaignRow.updated_at.desc())
        ).scalars().all()
    )

    campaigns_data = []
    for c in pending_campaigns_rows:
        latest_rev = (
            db.execute(
                select(CampaignRevisionRow)
                .where(CampaignRevisionRow.campaign_id == c.id)
                .order_by(CampaignRevisionRow.revision_number.desc())
                .limit(1)
            ).scalar_one_or_none()
        )
        campaigns_data.append({
            "id": c.id,
            "name": c.name,
            "channel": c.channel,
            "department": c.department,
            "status": c.status,
            "createdBy": c.created_by,
            "updatedAt": c.updated_at,
            "readinessScore": latest_rev.brand_readiness_score if latest_rev else 100.0,
            "fastTrackEligible": latest_rev.fast_track_eligible if latest_rev else False,
        })

    # Pending overrides
    overrides_rows = (
        db.execute(
            select(FindingOverrideRow)
            .where(FindingOverrideRow.status == "pending")
            .order_by(FindingOverrideRow.created_at.desc())
        ).scalars().all()
    )

    overrides_data = []
    for o in overrides_rows:
        finding = db.get(AuditFindingRow, o.finding_id)
        campaign = db.get(CampaignRow, o.campaign_id)
        overrides_data.append({
            "id": o.id,
            "findingId": o.finding_id,
            "campaignId": o.campaign_id,
            "campaignName": campaign.name if campaign else o.campaign_id,
            "ruleId": o.rule_id,
            "requestedBy": o.requested_by,
            "justification": o.justification,
            "status": o.status,
            "createdAt": o.created_at,
            "findingSnippet": finding.affected_text if finding else "",
            "findingExplanation": finding.explanation if finding else "",
            "findingCategory": finding.category if finding else "factual",
        })

    return {
        "pendingCampaigns": campaigns_data,
        "pendingOverrides": overrides_data,
        "queueCount": len(campaigns_data) + len(overrides_data),
    }


@router.post("/overrides/{override_id}/decide", response_model=FindingOverride)
def decide_override_route(
    override_id: str,
    payload: OverrideDecisionRequest,
    user: User = Depends(require("override.decide")),
    db: Session = Depends(get_db),
):
    """Manager or Specialist approves or rejects an override request."""
    return decide_override(
        db=db,
        override_id=override_id,
        approve=payload.approve,
        decision_note=payload.decision_note,
        user=user,
    )


@router.post("/campaigns/{campaign_id}/escalate")
def escalate_to_specialist(
    campaign_id: str,
    user: User = Depends(require("campaign.escalate")),
    db: Session = Depends(get_db),
):
    """Manager escalates a high-risk or legal finding to Specialist Reviewer."""
    camp = transition_campaign_status(
        db=db,
        campaign_id=campaign_id,
        target_status="pending_specialist",
        user=user,
        reason="Escalated to Legal / Brand Specialist for compliance sign-off",
    )
    return {"status": "escalated", "campaignId": camp.id}
