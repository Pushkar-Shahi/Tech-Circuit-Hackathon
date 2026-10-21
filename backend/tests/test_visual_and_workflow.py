"""Tests for Visual Inspector and Workflow State Machine."""

import pytest
from app.audit.visual_inspector import _contrast_ratio, _hex_to_rgb, inspect_visual_assets
from app.core.auth import User
from app.core.errors import ApiError
from app.db.models import CampaignRow
from app.db.session import session_scope
from app.workflow.state_machine import decide_override, submit_override_request, transition_campaign_status


def test_contrast_ratio_wcag():
    # Pure white (#FFFFFF) on pure black (#000000) is 21:1
    white = (255, 255, 255)
    black = (0, 0, 0)
    assert _contrast_ratio(white, black) >= 20.0

    # Low contrast gray on white
    light_gray = (220, 220, 220)
    assert _contrast_ratio(white, light_gray) < 2.0


def test_visual_inspector_detects_unapproved_palette():
    with session_scope() as db:
        # Pass a mock orange asset url which is simulated as unapproved color #FF5722
        findings = inspect_visual_assets(db, "BRAND-ACME-01", ["/mock_orange_creative.png"])
        assert len(findings) >= 1
        vis_finding = findings[0]
        assert vis_finding["category"] == "visual"
        assert vis_finding["severity"] in ("high", "medium")
        assert "Unapproved dominant color" in vis_finding["evidence"]


def test_workflow_permissions_and_transitions():
    with session_scope() as db:
        creator = User(name="Liam Chen", role="creator")
        manager = User(name="Sarah Jenkins", role="manager")

        camp = db.get(CampaignRow, "CAMP-DEMO-01")
        camp.status = "pending_manager"
        db.commit()

        # Creator cannot approve campaign directly
        with pytest.raises(ApiError) as exc_info:
            transition_campaign_status(db, "CAMP-DEMO-01", "approved", creator)
        assert exc_info.value.status == 403

        # Manager can approve campaign (transitioning from pending_manager)
        camp.status = "pending_manager"
        db.commit()
        approved_camp = transition_campaign_status(db, "CAMP-DEMO-01", "approved", manager)
        assert approved_camp.status == "approved"
