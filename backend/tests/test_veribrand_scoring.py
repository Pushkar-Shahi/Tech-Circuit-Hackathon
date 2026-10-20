"""Tests for Brand Readiness Score calculation and Fast-Track approval policy."""

from app.audit.orchestrator import calculate_brand_readiness_score


def test_scoring_weights_and_deductions():
    # 1 critical factual (-25), 1 high visual (-7.2), 1 medium tone (-1.5)
    findings = [
        {"category": "factual", "severity": "critical", "ruleId": "RULE-FACT-01"},
        {"category": "visual", "severity": "high", "ruleId": "RULE-VIS-01"},
        {"category": "tone", "severity": "medium", "ruleId": "RULE-TONE-01"},
    ]
    res = calculate_brand_readiness_score(findings)
    assert res["brandReadinessScore"] < 70.0
    assert res["fastTrackEligible"] is False
    assert res["scoreBreakdown"]["criticalCount"] == 1


def test_fast_track_eligible_when_score_high_and_zero_critical():
    # 1 low tone issue (-0.5 pts) -> score = 99.5
    findings = [
        {"category": "tone", "severity": "low", "ruleId": "RULE-TONE-01"},
    ]
    res = calculate_brand_readiness_score(findings)
    assert res["brandReadinessScore"] >= 95.0
    assert res["fastTrackEligible"] is True
    assert res["scoreBreakdown"]["criticalCount"] == 0


def test_critical_issue_blocks_fast_track_even_if_score_is_high():
    # Critical issue always disqualifies fast track
    findings = [
        {"category": "legal", "severity": "critical", "ruleId": "RULE-LEG-01"},
    ]
    res = calculate_brand_readiness_score(findings)
    assert res["fastTrackEligible"] is False
