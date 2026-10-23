"""Campaigns & Review Workspace Router for VeriBrand AI."""

from __future__ import annotations

import logging
import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit.orchestrator import run_multimodal_audit
from app.copilot.diff_engine import compute_unified_diff, compute_word_diff
from app.copilot.rewriter import apply_rewrite
from app.core.auth import User, current_user, require
from app.core.config import get_settings
from app.core.errors import ApiError
from app.db.models import (
    AuditFindingRow,
    CampaignRevisionRow,
    CampaignRow,
    GovernanceCommentRow,
    utcnow,
)
from app.db.session import get_db
from app.schemas import (
    AcceptRewriteRequest,
    AuditFinding,
    Campaign,
    CampaignCreate,
    CampaignRevision,
    CommentCreate,
    GovernanceComment,
    OverrideRequest,
    WorkflowTransitionRequest,
)
from app.workflow.state_machine import submit_override_request, transition_campaign_status

log = logging.getLogger("veribrand.campaigns_router")

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


def _hydrate_campaign(db: Session, c: CampaignRow) -> dict[str, Any]:
    """Hydrates campaign with its latest revision and current findings."""
    latest_rev = (
        db.execute(
            select(CampaignRevisionRow)
            .where(CampaignRevisionRow.campaign_id == c.id)
            .order_by(CampaignRevisionRow.revision_number.desc())
            .limit(1)
        ).scalar_one_or_none()
    )

    findings: list[AuditFindingRow] = []
    if latest_rev:
        findings = (
            db.execute(
                select(AuditFindingRow)
                .where(AuditFindingRow.revision_id == latest_rev.id)
                .order_by(AuditFindingRow.created_at.asc())
            ).scalars().all()
        )

    return {
        "id": c.id,
        "orgId": c.org_id,
        "brandId": c.brand_id,
        "name": c.name,
        "channel": c.channel,
        "department": c.department,
        "region": c.region,
        "agency": c.agency,
        "targetAudience": c.target_audience,
        "status": c.status,
        "createdBy": c.created_by,
        "createdAt": c.created_at,
        "updatedAt": c.updated_at,
        "latestRevision": latest_rev,
        "findings": findings,
    }


@router.get("", response_model=list[Campaign])
def list_campaigns(
    brand_id: str | None = None,
    status: str | None = None,
    channel: str | None = None,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """List campaigns with optional filters."""
    stmt = select(CampaignRow).where(CampaignRow.org_id == user.org_id)
    if brand_id:
        stmt = stmt.where(CampaignRow.brand_id == brand_id)
    if status:
        stmt = stmt.where(CampaignRow.status == status)
    if channel:
        stmt = stmt.where(CampaignRow.channel == channel)

    campaigns = db.execute(stmt.order_by(CampaignRow.updated_at.desc())).scalars().all()
    return [_hydrate_campaign(db, c) for c in campaigns]


@router.post("", response_model=Campaign)
def create_campaign(
    payload: CampaignCreate,
    user: User = Depends(require("campaign.create")),
    db: Session = Depends(get_db),
):
    """Create a new campaign draft and initialize revision v1."""
    camp_id = f"CAMP-{uuid.uuid4().hex[:8].upper()}"
    campaign = CampaignRow(
        id=camp_id,
        org_id=user.org_id,
        brand_id=payload.brand_id,
        name=payload.name,
        channel=payload.channel,
        department=payload.department,
        region=payload.region,
        agency=payload.agency,
        target_audience=payload.target_audience,
        status="draft",
        created_by=user.name,
        created_at=utcnow(),
        updated_at=utcnow(),
    )
    db.add(campaign)
    db.flush()

    # Revision v1
    rev_id = f"REV-{uuid.uuid4().hex[:8].upper()}"
    revision = CampaignRevisionRow(
        id=rev_id,
        campaign_id=camp_id,
        revision_number=1,
        content_text=payload.content_text,
        asset_urls=payload.asset_urls,
        brand_readiness_score=100.0,
        score_breakdown={},
        fast_track_eligible=False,
        created_by=user.name,
        created_at=utcnow(),
        change_summary="Initial campaign draft",
    )
    db.add(revision)
    db.commit()

    return _hydrate_campaign(db, campaign)


@router.get("/{campaign_id}", response_model=Campaign)
def get_campaign(
    campaign_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Get full campaign details, active revision, and all audit findings."""
    campaign = db.get(CampaignRow, campaign_id)
    if not campaign:
        raise ApiError(404, "not_found", f"Campaign {campaign_id} not found")
    return _hydrate_campaign(db, campaign)


@router.get("/{campaign_id}/revisions", response_model=list[CampaignRevision])
def get_campaign_revisions(
    campaign_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Get version history of all revisions for a campaign."""
    return db.execute(
        select(CampaignRevisionRow)
        .where(CampaignRevisionRow.campaign_id == campaign_id)
        .order_by(CampaignRevisionRow.revision_number.desc())
    ).scalars().all()


@router.post("/{campaign_id}/scan")
async def scan_campaign(
    campaign_id: str,
    user: User = Depends(require("campaign.scan")),
    db: Session = Depends(get_db),
):
    """Triggers parallel multimodal auditing (Fact Checker + Tone Analyzer + Visual Inspector)."""
    campaign = db.get(CampaignRow, campaign_id)
    if not campaign:
        raise ApiError(404, "not_found", f"Campaign {campaign_id} not found")

    latest_rev = (
        db.execute(
            select(CampaignRevisionRow)
            .where(CampaignRevisionRow.campaign_id == campaign_id)
            .order_by(CampaignRevisionRow.revision_number.desc())
            .limit(1)
        ).scalar_one_or_none()
    )
    if not latest_rev:
        raise ApiError(400, "no_revision", "No revisions found for this campaign")

    campaign.status = "scanning"
    db.commit()

    result = await run_multimodal_audit(db, campaign_id, latest_rev.id)
    return result


@router.post("/{campaign_id}/rewrites/accept", response_model=Campaign)
def accept_rewrite_route(
    campaign_id: str,
    payload: AcceptRewriteRequest,
    user: User = Depends(require("rewrite.accept")),
    db: Session = Depends(get_db),
):
    """Accept an AI rewrite option (Strict Compliance, Concise, Conversational), updating copy."""
    new_rev = apply_rewrite(
        db=db,
        campaign_id=campaign_id,
        finding_id=payload.finding_id,
        mode=payload.rewrite_mode,
        custom_text=payload.custom_text,
        user_name=user.name,
    )
    campaign = db.get(CampaignRow, campaign_id)
    return _hydrate_campaign(db, campaign)


@router.post("/{campaign_id}/override")
def request_override_route(
    campaign_id: str,
    payload: OverrideRequest,
    user: User = Depends(require("override.request")),
    db: Session = Depends(get_db),
):
    """Creator submits an override request with mandatory text justification."""
    override = submit_override_request(
        db=db,
        campaign_id=campaign_id,
        finding_id=payload.finding_id,
        justification=payload.justification,
        user=user,
    )
    return {"status": "submitted", "overrideId": override.id}


@router.post("/{campaign_id}/transition", response_model=Campaign)
def transition_campaign(
    campaign_id: str,
    payload: WorkflowTransitionRequest,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Transition campaign workflow status."""
    camp = transition_campaign_status(
        db=db,
        campaign_id=campaign_id,
        target_status=payload.target_status,
        user=user,
        reason=payload.reason,
    )
    return _hydrate_campaign(db, camp)


@router.get("/{campaign_id}/diff")
def get_campaign_diff(
    campaign_id: str,
    rev_a: int = 1,
    rev_b: int | None = None,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Computes word-level and line-level diff between two revisions."""
    revs = db.execute(
        select(CampaignRevisionRow)
        .where(CampaignRevisionRow.campaign_id == campaign_id)
        .order_by(CampaignRevisionRow.revision_number.asc())
    ).scalars().all()
    if not revs:
        raise ApiError(404, "not_found", "No revisions found")

    rev_map = {r.revision_number: r for r in revs}
    first_rev = rev_map.get(rev_a, revs[0])
    target_rev = rev_map.get(rev_b, revs[-1]) if rev_b else revs[-1]

    word_diff = compute_word_diff(first_rev.content_text, target_rev.content_text)
    unified = compute_unified_diff(
        first_rev.content_text,
        target_rev.content_text,
        f"v{first_rev.revision_number}",
        f"v{target_rev.revision_number}",
    )
    return {
        "revA": first_rev.revision_number,
        "revB": target_rev.revision_number,
        "wordDiff": word_diff,
        "unifiedDiff": unified,
    }


@router.get("/{campaign_id}/comments", response_model=list[GovernanceComment])
def list_comments(
    campaign_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Get discussion comments for a campaign."""
    return db.execute(
        select(GovernanceCommentRow)
        .where(GovernanceCommentRow.campaign_id == campaign_id)
        .order_by(GovernanceCommentRow.created_at.asc())
    ).scalars().all()


@router.post("/{campaign_id}/comments", response_model=GovernanceComment)
def add_comment(
    campaign_id: str,
    payload: CommentCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Add a comment or mention in the campaign review thread."""
    comment = GovernanceCommentRow(
        id=f"CMT-{uuid.uuid4().hex[:8].upper()}",
        campaign_id=campaign_id,
        finding_id=payload.finding_id,
        author=user.name,
        body=payload.body,
        mentions=payload.mentions,
        created_at=utcnow(),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.post("/{campaign_id}/assets")
async def upload_campaign_asset(
    campaign_id: str,
    file: UploadFile = File(...),
    user: User = Depends(require("campaign.edit")),
    db: Session = Depends(get_db),
):
    """Upload visual asset for a campaign, save to settings.data_dir / 'uploads', and attach exact path to revision."""
    campaign = db.get(CampaignRow, campaign_id)
    if not campaign:
        raise ApiError(404, "not_found", f"Campaign {campaign_id} not found")

    settings = get_settings()
    uploads_dir = settings.data_dir / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)

    file_ext = Path(file.filename or "asset.png").suffix or ".png"
    safe_name = f"{campaign_id}_{uuid.uuid4().hex[:8]}{file_ext}"
    dest_path = uploads_dir / safe_name

    content = await file.read()
    dest_path.write_bytes(content)
    readable_path = str(dest_path.resolve())

    latest_rev = (
        db.execute(
            select(CampaignRevisionRow)
            .where(CampaignRevisionRow.campaign_id == campaign_id)
            .order_by(CampaignRevisionRow.revision_number.desc())
            .limit(1)
        ).scalar_one_or_none()
    )
    if latest_rev:
        urls = list(latest_rev.asset_urls or [])
        urls.append(readable_path)
        latest_rev.asset_urls = urls
        db.commit()
        db.refresh(latest_rev)

    return {
        "status": "uploaded",
        "filename": safe_name,
        "path": readable_path,
        "campaignId": campaign_id,
    }

