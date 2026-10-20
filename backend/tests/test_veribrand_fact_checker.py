"""Tests for VeriBrand AI Fact Checker."""

import pytest
from app.audit.fact_checker import check_facts
from app.db.models import BrandRow, FactRegistryRow, OrganizationRow
from app.db.session import session_scope


def test_fact_checker_detects_outdated_price_and_prohibited_terms():
    with session_scope() as db:
        # Sample copy with outdated price and prohibited claim
        sample_copy = "Get Acme Cloud Pro for just $39/mo! It is 100% unhackable and guaranteed to protect you."
        findings = check_facts(db, "BRAND-ACME-01", sample_copy)

        assert len(findings) >= 2

        # Verify outdated price finding
        price_findings = [f for f in findings if f["category"] == "factual" and "$39/mo" in (f.get("affectedText") or "")]
        assert len(price_findings) == 1
        assert price_findings[0]["severity"] == "critical"
        assert "49" in price_findings[0]["suggestedResolutions"]["strictCompliance"]

        # Verify prohibited term finding
        prohibited_findings = [f for f in findings if f["category"] == "legal" and "unhackable" in (f.get("affectedText") or "")]
        assert len(prohibited_findings) == 1
        assert prohibited_findings[0]["severity"] == "critical"
