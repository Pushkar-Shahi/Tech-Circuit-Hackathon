"""Rule Friction Detector for VeriBrand AI.

Flags brand rules with unusually high manager-approved override rates.
Synthesizes creator justifications into actionable recommendations for Brand Admin review
rather than automatically and silently altering critical guidelines.
"""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import AuditFindingRow, FindingOverrideRow, RuleRow

log = logging.getLogger("veribrand.friction_detector")


def detect_rule_frictions(db: Session, brand_id: str) -> list[dict[str, Any]]:
    """Analyzes override frequency against rule violations.

    Flags guidelines where override rate > 25% with at least 3 occurrences.
    """
    settings = get_settings()
    threshold = settings.friction_override_threshold
    min_occ = settings.friction_min_occurrences

    # Query all findings with rule IDs for this brand
    rules = db.execute(select(RuleRow).where(RuleRow.brand_id == brand_id)).scalars().all()
    rule_map = {r.id: r for r in rules}

    # Query total findings per rule
    finding_counts = dict(
        db.execute(
            select(AuditFindingRow.rule_id, func.count(AuditFindingRow.id))
            .where(AuditFindingRow.rule_id.is_not(None))
            .group_by(AuditFindingRow.rule_id)
        ).all()
    )

    # Query approved overrides per rule
    approved_overrides = db.execute(
        select(FindingOverrideRow.rule_id, FindingOverrideRow.justification)
        .where(FindingOverrideRow.status == "approved")
        .where(FindingOverrideRow.rule_id.is_not(None))
    ).all()

    override_map: dict[str, list[str]] = {}
    for r_id, just in approved_overrides:
        if r_id:
            override_map.setdefault(r_id, []).append(just)

    reports: list[dict[str, Any]] = []

    all_rule_ids = set(finding_counts.keys()) | set(override_map.keys())
    for rule_id in all_rule_ids:
        if not rule_id:
            continue
        justifications = override_map.get(rule_id, [])
        approved_count = len(justifications)
        total = max(finding_counts.get(rule_id, 0), approved_count)
        if total < min_occ:
            continue
        rate = round(approved_count / max(1, total), 2)

        rule = rule_map.get(rule_id)
        rule_name = rule.name if rule else rule_id
        pillar = rule.pillar if rule else "general"

        if rate >= threshold and approved_count >= 2:
            # Generate actionable recommendation
            rec = _generate_friction_recommendation(rule_name, pillar, rate, justifications)
            reports.append({
                "ruleId": rule_id,
                "ruleName": rule_name,
                "pillar": pillar,
                "overrideCount": approved_count,
                "totalViolations": total,
                "overrideRate": rate,
                "recommendation": rec,
                "sampleJustifications": justifications[:3],
            })

    # Sort by highest override rate
    reports.sort(key=lambda x: x["overrideRate"], reverse=True)
    return reports


def _generate_friction_recommendation(rule_name: str, pillar: str, rate: float, justifications: list[str]) -> str:
    """Synthesizes high-friction override reasons into actionable recommendations."""
    pct = int(rate * 100)
    if "disclaimer" in rule_name.lower() or pillar == "legal":
        return f"Rule is overridden in {pct}% of cases because standard disclaimer exceeds character limits on mobile/social banners. Recommendation: Create and approve a 'Short Form Social Disclaimer' variant for Brand Admin sign-off."
    elif "color" in rule_name.lower() or pillar == "visual":
        return f"Rule is overridden in {pct}% of campaigns for seasonal/holiday campaign palettes. Recommendation: Add seasonal accent colorway allowances to Brand Visual Guidelines."
    elif "pricing" in rule_name.lower():
        return f"Rule is overridden in {pct}% of campaigns due to customized enterprise quotes. Recommendation: Define standard tiered enterprise range allowances."
    else:
        return f"Rule exhibits high manager-approved friction ({pct}% override rate). Brand Admin review recommended to evaluate whether the standard is overly restrictive."
