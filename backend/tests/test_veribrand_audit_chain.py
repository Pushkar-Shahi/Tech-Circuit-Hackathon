"""Tests for Cryptographic SHA-256 Audit Chain and Rule Friction Detector."""

from app.analytics.friction_detector import detect_rule_frictions
from app.db.session import session_scope
from app.workflow.audit_logger import log_governance_event, verify_audit_chain_integrity


def test_audit_chain_integrity():
    with session_scope() as db:
        # Verify integrity of existing seeded chain
        result = verify_audit_chain_integrity(db)
        assert result["valid"] is True
        assert result["count"] >= 6

        # Append new event
        new_row = log_governance_event(
            db=db,
            actor_name="Marcus Sterling",
            actor_role="admin",
            action="rule.test_audit",
            target_type="test",
            target_id="TEST-01",
            after_state={"tested": True},
        )
        assert new_row.hash is not None

        # Re-verify integrity
        res2 = verify_audit_chain_integrity(db)
        assert res2["valid"] is True
        assert res2["count"] >= 7


def test_rule_friction_detector_flags_high_override_rule():
    with session_scope() as db:
        reports = detect_rule_frictions(db, "BRAND-ACME-01")
        assert len(reports) >= 1
        top_friction = reports[0]
        # Should flag RULE-FACT-DISCLAIMER-01
        assert "DISCLAIMER" in top_friction["ruleId"]
        assert top_friction["overrideRate"] >= 0.25
        assert "Recommendation:" in top_friction["recommendation"]
