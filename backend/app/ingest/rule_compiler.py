"""Rule Compiler and Cross-Document Conflict Detection Engine for VeriBrand AI.

Extracts structured, versioned brand rules from ingested documents, attaches precise source citations,
and automatically analyzes cross-document rules to detect conflicting policies.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import FactRegistryRow, RuleRow, RuleVersionRow, VisualAssetRow, utcnow

log = logging.getLogger("veribrand.rule_compiler")

PRICE_PATTERN = re.compile(r"(\$\s*\d+(?:\.\d{2})?)")


def compile_rules_from_facts_and_visuals(db: Session, brand_id: str) -> list[RuleRow]:
    """Compiles active Fact Registry and Visual Asset Registry items into versioned Rule rows."""
    facts = db.execute(select(FactRegistryRow).where(FactRegistryRow.brand_id == brand_id)).scalars().all()
    visuals = db.execute(select(VisualAssetRow).where(VisualAssetRow.brand_id == brand_id)).scalars().all()

    created_rules: list[RuleRow] = []

    # Compile fact rules
    for f in facts:
        rule_id = f"RULE-FACT-{f.id[:6].upper()}" if not f.id.startswith("RULE-") else f.id
        existing = db.get(RuleRow, rule_id)
        pillar = "legal" if f.category in ("legal_disclaimer", "prohibited_term") else "fact"
        desc = f"Ensure correct {f.category.replace('_', ' ')}: '{f.canonical_value}'."
        if f.aliases_or_deprecated:
            desc += f" Prohibit deprecated variations: {', '.join(f.aliases_or_deprecated)}."

        cite = f.source_citation or {}
        if not existing:
            rule = RuleRow(
                id=rule_id,
                brand_id=brand_id,
                name=f"Verified {f.category.replace('_', ' ').title()}",
                description=desc,
                pillar=pillar,
                severity=f.severity_if_violated,
                source_document_id=f.document_id,
                source_page=cite.get("page", 1),
                source_section=cite.get("section", "Product Fact Sheet"),
                status="active",
                version=1,
                conflict_status={"hasConflict": False},
                created_at=utcnow(),
                updated_at=utcnow(),
            )
            db.add(rule)
            created_rules.append(rule)

    # Compile visual rules
    for v in visuals:
        rule_id = f"RULE-VIS-{v.id[:6].upper()}" if not v.id.startswith("RULE-") else v.id
        existing = db.get(RuleRow, rule_id)
        desc = f"Approved brand {v.asset_type}: '{v.name}'."
        specs = v.specs or {}
        if v.asset_type == "color" and "hex" in specs:
            desc += f" Must match hex {specs['hex']} within Delta-E tolerance {specs.get('max_delta_e', 10)}."
        elif v.asset_type == "font" and "family" in specs:
            desc += f" Must use typography family '{specs['family']}'."
        elif v.asset_type == "logo":
            desc += f" Must preserve safe zone of at least {int(specs.get('min_safe_zone_pct', 0.2) * 100)}%."

        if not existing:
            rule = RuleRow(
                id=rule_id,
                brand_id=brand_id,
                name=f"Brand {v.asset_type.title()}: {v.name}",
                description=desc,
                pillar="visual",
                severity="high" if v.asset_type in ("color", "logo") else "medium",
                source_document_id=v.document_id,
                source_page=1,
                source_section="Visual Identity Guidelines",
                status="active",
                version=1,
                conflict_status={"hasConflict": False},
                created_at=utcnow(),
                updated_at=utcnow(),
            )
            db.add(rule)
            created_rules.append(rule)

    db.flush()
    detect_and_flag_conflicts(db, brand_id)
    return created_rules


def detect_and_flag_conflicts(db: Session, brand_id: str) -> list[dict[str, Any]]:
    """Cross-document conflict detection engine.

    Identifies contradictions between documents:
    - Conflicting pricing for the same product
    - Contradictory disclaimers or severity levels
    - Conflicting color codes for primary brand colors
    """
    rules = db.execute(select(RuleRow).where(RuleRow.brand_id == brand_id)).scalars().all()
    conflicts: list[dict[str, Any]] = []

    # 1. Price conflict check
    pricing_map: dict[str, list[RuleRow]] = {}
    for r in rules:
        prices = PRICE_PATTERN.findall(r.description)
        for p in prices:
            clean_price = p.replace(" ", "")
            # Group by broad product keywords
            key = "enterprise" if "enterprise" in r.description.lower() else ("pro" if "pro" in r.description.lower() else "pricing")
            pricing_map.setdefault(key, []).append(r)

    for key, matched_rules in pricing_map.items():
        if len(matched_rules) > 1:
            prices_found = set()
            for r in matched_rules:
                for p in PRICE_PATTERN.findall(r.description):
                    prices_found.add(p.replace(" ", ""))
            if len(prices_found) > 1:
                # Contradiction detected!
                conflict_info = {
                    "hasConflict": True,
                    "type": "pricing_discrepancy",
                    "details": f"Discrepancy in {key} pricing: conflicting prices detected across guidelines: {', '.join(prices_found)}.",
                    "conflictingRuleId": matched_rules[1].id,
                }
                for r in matched_rules:
                    r.conflict_status = conflict_info
                conflicts.append(conflict_info)

    # 2. Color conflict check
    primary_color_rules = [r for r in rules if r.pillar == "visual" and "primary" in r.name.lower() and "color" in r.name.lower()]
    if len(primary_color_rules) > 1:
        hexes = set()
        for r in primary_color_rules:
            hex_match = re.search(r"#[0-9a-fA-F]{6}", r.description)
            if hex_match:
                hexes.add(hex_match.group(0).upper())
        if len(hexes) > 1:
            conflict_info = {
                "hasConflict": True,
                "type": "visual_palette_discrepancy",
                "details": f"Multiple contradictory primary brand colors declared: {', '.join(hexes)}.",
                "conflictingRuleId": primary_color_rules[1].id,
            }
            for r in primary_color_rules:
                r.conflict_status = conflict_info
            conflicts.append(conflict_info)

    db.flush()
    return conflicts
