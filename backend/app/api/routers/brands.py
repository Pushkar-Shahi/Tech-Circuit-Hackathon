"""Brands Router for VeriBrand AI."""

from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import User, current_user, require
from app.core.errors import ApiError
from app.db.models import BrandRow, OrganizationRow, utcnow
from app.db.session import get_db
from app.schemas import Brand, BrandCreate

router = APIRouter(prefix="/brands", tags=["brands"])


@router.get("", response_model=list[Brand])
def list_brands(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """List all brands belonging to the current organization."""
    return db.execute(select(BrandRow).where(BrandRow.org_id == user.org_id)).scalars().all()


@router.post("", response_model=Brand)
def create_brand(
    payload: BrandCreate,
    user: User = Depends(require("brand.manage")),
    db: Session = Depends(get_db),
):
    """Create a new brand profile with custom tone rubric and visual identity."""
    brand_id = f"BRAND-{uuid.uuid4().hex[:8].upper()}"
    brand = BrandRow(
        id=brand_id,
        org_id=user.org_id,
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
        tone_rubric=payload.tone_rubric or {
            "formality": 80,
            "confidence": 85,
            "technicality": 65,
            "empathy": 75,
            "brand_voice": "Authoritative, innovative, clear",
            "prohibited_tones": ["slang", "hyperbolic", "condescending"],
        },
        identity=payload.identity or {
            "primaryColor": "#0A192F",
            "secondaryColor": "#00D2DF",
            "fontFamily": "Inter",
        },
        created_by=user.name,
        created_at=utcnow(),
        updated_at=utcnow(),
    )
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return brand


@router.get("/{brand_id}", response_model=Brand)
def get_brand(brand_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Get brand details and configured rubrics."""
    brand = db.get(BrandRow, brand_id)
    if not brand:
        raise ApiError(404, "not_found", f"Brand {brand_id} not found")
    return brand


@router.put("/{brand_id}", response_model=Brand)
def update_brand(
    brand_id: str,
    payload: BrandCreate,
    user: User = Depends(require("brand.manage")),
    db: Session = Depends(get_db),
):
    """Update brand rubric and visual tokens."""
    brand = db.get(BrandRow, brand_id)
    if not brand:
        raise ApiError(404, "not_found", f"Brand {brand_id} not found")

    brand.name = payload.name
    brand.description = payload.description
    if payload.tone_rubric:
        brand.tone_rubric = payload.tone_rubric
    if payload.identity:
        brand.identity = payload.identity
    brand.updated_at = utcnow()
    db.commit()
    db.refresh(brand)
    return brand
