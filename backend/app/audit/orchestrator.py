"""Auditing Orchestrator for VeriBrand AI.

Runs Fact Checker, Tone Analyzer, and Visual Inspector in parallel.
Aggregates findings, computes transparent Brand Readiness Scores, and evaluates Fast-Track approvals.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.audit.fact_checker import check_facts
from app.audit.tone_analyzer import analyze_tone
from app.audit.visual_inspector import inspect_visual_assets
from app.core.config import get_settings
from app.db.models import AuditFindingRow, BrandRow, CampaignRevisionRow, CampaignRow, RuleRow, utcnow

log = logging.getLogger("veribrand.orchestrator")

SEVERITY_MULTIPLIERS = {
    "critical": 1.0,
    "high": 0.6,
    "medium": 0.3,
    "low": 0.1,
}


def calculate_brand_readiness_score(findings: list[dict[str, Any]]) -> dict[str, Any]:
    """Calculates Brand Readiness Score (0-100) and itemized penalty breakdown.

    Scoring Policy:
    - Base: 100 points
    - Factual violations: 25 pts baseline * severity multiplier
    - Visual violations: 12 pts baseline * severity multiplier
    - Tone violations: 5 pts baseline * severity multiplier
    - Clamped between 0.0 and 100.0.
    """
    settings = get_settings()
    base_score = 100.0

    fact_weight = settings.factual_weight
    vis_weight = settings.visual_weight
    tone_weight = settings.tone_weight

    factual_deductions = 0.0
    visual_deductions = 0.0
    tone_deductions = 0.0

    crit_count = 0
    high_count = 0
    med_count = 0
    low_count = 0
    details: list[dict[str, Any]] = []

    for f in findings:
        cat = f.get("category", "factual")
        sev = f.get("severity", "medium").lower()
        mult = SEVERITY_MULTIPLIERS.get(sev, 0.3)

        if sev == "critical":
            crit_count += 1
        elif sev == "high":
            high_count += 1
        elif sev == "medium":
            med_count += 1
        else:
            low_count += 1

        if cat in ("factual", "legal"):
            penalty = round(fact_weight * mult, 2)
            factual_deductions += penalty
        elif cat == "visual":
            penalty = round(vis_weight * mult, 2)
            visual_deductions += penalty
        else:
            penalty = round(tone_weight * mult, 2)
            tone_deductions += penalty

        details.append({
            "ruleId": f.get("ruleId"),
            "category": cat,
            "severity": sev,
            "penaltyPoints": penalty,
        })

    total_deductions = factual_deductions + visual_deductions + tone_deductions
    final_score = max(0.0, min(100.0, round(base_score - total_deductions, 1)))

    # Fast-track policy: Score >= 95 ONLY IF critical_count == 0
    fast_track_eligible = (final_score >= settings.fast_track_threshold) and (crit_count == 0)

    return {
        "brandReadinessScore": final_score,
        "fastTrackEligible": fast_track_eligible,
        "scoreBreakdown": {
            "factualDeductions": round(factual_deductions, 1),
            "visualDeductions": round(visual_deductions, 1),
            "toneDeductions": round(tone_deductions, 1),
            "criticalCount": crit_count,
            "highCount": high_count,
            "mediumCount": med_count,
            "lowCount": low_count,
            "penaltyDetails": details,
        },
    }


async def run_multimodal_audit(
    db: Session,
    campaign_id: str,
    revision_id: str,
) -> dict[str, Any]:
    """Coordinates parallel execution of Fact Checker, Tone Analyzer, and Visual Inspector."""
    campaign = db.get(CampaignRow, campaign_id)
    revision = db.get(CampaignRevisionRow, revision_id)
    if not campaign or not revision:
        raise ValueError(f"Campaign {campaign_id} or Revision {revision_id} not found")

    brand = db.get(BrandRow, campaign.brand_id)
    tone_rubric = brand.tone_rubric if brand else {}

    # Parallel execution using asyncio
    loop = asyncio.get_event_loop()

    # Fact checker
    fact_future = loop.run_in_executor(None, check_facts, db, campaign.brand_id, revision.content_text)
    # Visual inspector
    vis_future = loop.run_in_executor(None, inspect_visual_assets, db, campaign.brand_id, revision.asset_urls or [])
    # Tone analyzer
    tone_future = loop.run_in_executor(None, analyze_tone, revision.content_text, tone_rubric)

    fact_findings, vis_findings, tone_result = await asyncio.gather(fact_future, vis_future, tone_future)
    tone_findings = tone_result.get("findings", [])

    all_raw_findings = fact_findings + tone_findings + vis_findings

    # Clear prior findings for this revision
    prior_findings = db.execute(select(AuditFindingRow).where(AuditFindingRow.revision_id == revision_id)).scalars().all()
    for pf in prior_findings:
        db.delete(pf)
    db.flush()

    # Create new findings
    persisted_findings: list[AuditFindingRow] = []
    for idx, f in enumerate(all_raw_findings):
        finding_id = f"FIND-{uuid.uuid4().hex[:6].upper()}"
        row = AuditFindingRow(
            id=finding_id,
            campaign_id=campaign_id,
            revision_id=revision_id,
            rule_id=f.get("ruleId"),
            category=f.get("category", "factual"),
            severity=f.get("severity", "medium"),
            affected_text=f.get("affectedText"),
            text_offset=f.get("textOffset"),
            visual_location=f.get("visualLocation"),
            evidence=f.get("evidence", ""),
            source_citation=f.get("sourceCitation", {}),
            explanation=f.get("explanation", ""),
            suggested_resolutions=f.get("suggestedResolutions", {}),
            certainty=f.get("certainty", 1.0),
            uncertainty_flag=f.get("uncertaintyFlag", False),
            status="open",
            created_at=utcnow(),
            updated_at=utcnow(),
        )
        db.add(row)
        persisted_findings.append(row)

    # Compute Brand Readiness Score
    score_data = calculate_brand_readiness_score(all_raw_findings)
    revision.brand_readiness_score = score_data["brandReadinessScore"]
    revision.score_breakdown = score_data["scoreBreakdown"]
    revision.fast_track_eligible = score_data["fastTrackEligible"]

    # Update campaign status
    if score_data["fastTrackEligible"]:
        campaign.status = "approved"  # Fast-track approved!
    elif score_data["scoreBreakdown"]["criticalCount"] > 0 or score_data["brandReadinessScore"] < 80:
        campaign.status = "needs_revision"
    else:
        campaign.status = "pending_manager"

    campaign.updated_at = utcnow()
    db.commit()

    return {
        "campaignId": campaign_id,
        "revisionId": revision_id,
        "brandReadinessScore": revision.brand_readiness_score,
        "fastTrackEligible": revision.fast_track_eligible,
        "scoreBreakdown": revision.score_breakdown,
        "status": campaign.status,
        "findingsCount": len(persisted_findings),
    }
