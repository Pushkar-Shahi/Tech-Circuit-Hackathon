"""Governance Analytics Router for VeriBrand AI."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.analytics.friction_detector import detect_rule_frictions
from app.analytics.service import get_governance_analytics
from app.core.auth import User, current_user, require
from app.db.session import get_db
from app.schemas import GovernanceAnalytics

log = logging.getLogger("veribrand.analytics_router")

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("", response_model=GovernanceAnalytics)
def get_analytics(
    brand_id: str = Query("BRAND-ACME-01"),
    user: User = Depends(require("analytics.view")),
    db: Session = Depends(get_db),
):
    """Retrieve compliance trends (7/30/90d), drift heatmaps, and Rule Friction Detector alerts."""
    return get_governance_analytics(db, brand_id)


@router.get("/friction")
def get_friction_reports(
    brand_id: str = Query("BRAND-ACME-01"),
    user: User = Depends(require("analytics.view")),
    db: Session = Depends(get_db),
):
    """Retrieve guidelines exhibiting high manager-approved override rates with recommended fixes."""
    return detect_rule_frictions(db, brand_id)
