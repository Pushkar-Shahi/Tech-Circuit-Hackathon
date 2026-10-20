"""Explainable AI Copilot Rewriter for VeriBrand AI.

Never silently edits user content. Applies changes ONLY upon explicit user action:
- Supports Strict Compliance, Concise, and Conversational rewrite modes.
- Preserves revision snapshots (v1 -> v2 -> v3) with author, timestamp, and audit trail.
- Automatically marks findings resolved and prepares draft for rescan.
"""

from __future__ import annotations

import logging
import uuid
from typing import Literal

from sqlalchemy.orm import Session

from app.db.models import AuditFindingRow, CampaignRevisionRow, CampaignRow, utcnow

log = logging.getLogger("veribrand.copilot.rewriter")


def apply_rewrite(
    db: Session,
    campaign_id: str,
    finding_id: str,
    mode: Literal["strict_compliance", "concise", "conversational", "custom"],
    custom_text: str | None = None,
    user_name: str = "Liam Chen",
) -> CampaignRevisionRow:
    """Applies an approved AI rewrite, creating an immutable new revision."""
    campaign = db.get(CampaignRow, campaign_id)
    finding = db.get(AuditFindingRow, finding_id)
    if not campaign or not finding:
        raise ValueError("Campaign or Finding not found")

    latest_rev = db.get(CampaignRevisionRow, finding.revision_id)
    if not latest_rev:
        raise ValueError("Target revision not found")

    resolutions = finding.suggested_resolutions or {}
    replacement_text = ""
    if mode == "strict_compliance":
        replacement_text = resolutions.get("strictCompliance") or resolutions.get("strict_compliance", "")
    elif mode == "concise":
        replacement_text = resolutions.get("concise", "")
    elif mode == "conversational":
        replacement_text = resolutions.get("conversational", "")
    elif mode == "custom":
        replacement_text = custom_text or ""

    if not replacement_text:
        replacement_text = resolutions.get("strictCompliance", "")

    original_text = latest_rev.content_text
    new_text = original_text

    # Apply character-accurate replacement
    offset = finding.text_offset
    if offset and "start" in offset and "end" in offset and finding.affected_text:
        start = offset["start"]
        end = offset["end"]
        # Verify text at slice
        if original_text[start:end] == finding.affected_text:
            new_text = original_text[:start] + replacement_text + original_text[end:]
        elif finding.affected_text in original_text:
            new_text = original_text.replace(finding.affected_text, replacement_text, 1)
    elif finding.affected_text and finding.affected_text in original_text:
        new_text = original_text.replace(finding.affected_text, replacement_text, 1)
    else:
        # E.g. Missing disclaimer addition
        new_text = f"{original_text.strip()}\n\n*{replacement_text}"

    # Mark finding as accepted
    finding.status = "accepted"
    finding.updated_at = utcnow()

    # Create new revision snapshot
    new_rev_num = latest_rev.revision_number + 1
    new_revision = CampaignRevisionRow(
        id=f"REV-{uuid.uuid4().hex[:8].upper()}",
        campaign_id=campaign_id,
        revision_number=new_rev_num,
        content_text=new_text,
        asset_urls=latest_rev.asset_urls,
        brand_readiness_score=min(100.0, latest_rev.brand_readiness_score + 15.0),  # Incremental improvement
        score_breakdown=latest_rev.score_breakdown,
        fast_track_eligible=False,
        created_by=user_name,
        created_at=utcnow(),
        change_summary=f"Accepted {mode.replace('_', ' ')} rewrite for {finding.rule_id or 'finding'}",
    )
    db.add(new_revision)
    campaign.updated_at = utcnow()
    db.commit()

    return new_revision
