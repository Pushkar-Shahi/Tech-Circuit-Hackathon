"""Brand Brain Ingestion & Knowledge Stores Router for VeriBrand AI."""

from __future__ import annotations

import logging
from pathlib import Path
import shutil
import uuid
from typing import Any

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import User, current_user, require
from app.core.config import get_settings
from app.core.errors import ApiError
from app.db.models import FactRegistryRow, KnowledgeChunkRow, KnowledgeDocRow, RuleRow, VisualAssetRow, utcnow
from app.db.session import get_db
from app.ingest.guideline_parser import extract_pdf_content, parse_csv_fact_sheet
from app.ingest.rule_compiler import compile_rules_from_facts_and_visuals, detect_and_flag_conflicts
from app.ingest.vector_store import chunk_text, generate_embedding, search_vector_chunks
from app.schemas import BrandRule, FactItem, FactItemCreate, KnowledgeDoc, RuleUpdate, VisualAsset

log = logging.getLogger("veribrand.brain_router")

router = APIRouter(prefix="/brain", tags=["brain"])


@router.get("/documents", response_model=list[KnowledgeDoc])
def list_documents(
    brand_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """List all ingested guideline and fact sheet documents for a brand."""
    return db.execute(select(KnowledgeDocRow).where(KnowledgeDocRow.brand_id == brand_id)).scalars().all()


@router.post("/upload")
async def upload_knowledge_document(
    brand_id: str = Form(...),
    title: str = Form(...),
    document_type: str = Form("brand_guidelines_pdf"),
    file: UploadFile = File(...),
    user: User = Depends(require("brain.ingest")),
    db: Session = Depends(get_db),
):
    """Upload and parse brand guideline PDFs, CSV fact sheets, or visual logos."""
    settings = get_settings()
    upload_dir = settings.upload_dir / brand_id
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
    filename = f"{file_id}_{file.filename}"
    file_path = upload_dir / filename

    # Save uploaded file
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = file_path.stat().st_size
    mime_type = file.content_type or "application/octet-stream"

    extracted_metadata: dict[str, Any] = {}
    created_facts_count = 0
    created_chunks_count = 0

    # Parse according to document type
    if file_path.suffix.lower() == ".pdf":
        pdf_res = extract_pdf_content(file_path)
        extracted_metadata = {
            "pageCount": pdf_res["pageCount"],
            "extractedColors": pdf_res["extractedColors"],
            "extractedFonts": pdf_res["extractedFonts"],
        }
        # Chunk text for Vector Store
        passages = chunk_text(pdf_res["fullText"])
        for idx, passage in enumerate(passages):
            chunk_row = KnowledgeChunkRow(
                id=f"CHK-{uuid.uuid4().hex[:8].upper()}",
                brand_id=brand_id,
                document_id=file_id,
                category="brand_voice" if idx < 3 else "style_guide",
                content=passage,
                page_number=(idx // 2) + 1,
                section_title="Brand Guidelines",
                embedding=generate_embedding(passage),
                created_at=utcnow(),
            )
            db.add(chunk_row)
            created_chunks_count += 1

    elif file_path.suffix.lower() == ".csv":
        rows = parse_csv_fact_sheet(file_path)
        extracted_metadata = {"rowCount": len(rows)}
        for row in rows:
            cat = row.get("category", "pricing").lower()
            val = row.get("canonical_value") or row.get("price") or row.get("value") or ""
            if val:
                aliases = [a.strip() for a in row.get("aliases", "").split(";") if a.strip()]
                fact = FactRegistryRow(
                    id=f"FACT-{uuid.uuid4().hex[:8].upper()}",
                    brand_id=brand_id,
                    document_id=file_id,
                    category=cat if cat in ("pricing", "product_name", "statistic", "legal_disclaimer", "prohibited_term") else "pricing",
                    canonical_value=val,
                    aliases_or_deprecated=aliases,
                    severity_if_violated=row.get("severity", "critical"),
                    source_citation={"documentTitle": title, "page": 1, "section": row.get("tier", "Pricing Schedule")},
                    status="active",
                    created_at=utcnow(),
                )
                db.add(fact)
                created_facts_count += 1

    doc_row = KnowledgeDocRow(
        id=file_id,
        brand_id=brand_id,
        title=title,
        document_type=document_type,
        file_path=str(file_path),
        file_size=file_size,
        mime_type=mime_type,
        status="parsed",
        extracted_metadata=extracted_metadata,
        created_at=utcnow(),
    )
    db.add(doc_row)
    db.commit()

    # Re-compile rules and detect cross-document conflicts
    compile_rules_from_facts_and_visuals(db, brand_id)
    conflicts = detect_and_flag_conflicts(db, brand_id)

    return {
        "documentId": file_id,
        "title": title,
        "status": "parsed",
        "createdChunks": created_chunks_count,
        "createdFacts": created_facts_count,
        "conflictsDetected": len(conflicts),
    }


@router.get("/facts", response_model=list[FactItem])
def list_facts(
    brand_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """List all verified items in the Fact Registry."""
    return db.execute(select(FactRegistryRow).where(FactRegistryRow.brand_id == brand_id)).scalars().all()


@router.post("/facts", response_model=FactItem)
def create_fact_item(
    brand_id: str,
    payload: FactItemCreate,
    user: User = Depends(require("rules.manage")),
    db: Session = Depends(get_db),
):
    """Add a verified fact, pricing tier, disclaimer, or banned term."""
    fact_id = f"FACT-{uuid.uuid4().hex[:8].upper()}"
    fact = FactRegistryRow(
        id=fact_id,
        brand_id=brand_id,
        category=payload.category,
        canonical_value=payload.canonical_value,
        aliases_or_deprecated=payload.aliases_or_deprecated,
        severity_if_violated=payload.severity_if_violated,
        source_citation=payload.source_citation,
        status=payload.status,
        created_at=utcnow(),
    )
    db.add(fact)
    db.commit()
    db.refresh(fact)

    # Recompile rules
    compile_rules_from_facts_and_visuals(db, brand_id)
    return fact


@router.get("/visuals", response_model=list[VisualAsset])
def list_visual_assets(
    brand_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """List approved brand visual assets (colors, typography, logo guidelines)."""
    return db.execute(select(VisualAssetRow).where(VisualAssetRow.brand_id == brand_id)).scalars().all()


@router.get("/rules", response_model=list[BrandRule])
def list_rules(
    brand_id: str,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """List all versioned brand governance rules with conflict status."""
    return db.execute(select(RuleRow).where(RuleRow.brand_id == brand_id)).scalars().all()


@router.put("/rules/{rule_id}", response_model=BrandRule)
def update_rule(
    rule_id: str,
    payload: RuleUpdate,
    user: User = Depends(require("rules.manage")),
    db: Session = Depends(get_db),
):
    """Update rule status, severity, or description with version snapshot."""
    rule = db.get(RuleRow, rule_id)
    if not rule:
        raise ApiError(404, "not_found", f"Rule {rule_id} not found")

    rule.version += 1
    if payload.name:
        rule.name = payload.name
    if payload.description:
        rule.description = payload.description
    if payload.severity:
        rule.severity = payload.severity
    if payload.status:
        rule.status = payload.status
    rule.updated_at = utcnow()
    db.commit()
    db.refresh(rule)
    return rule


@router.get("/search")
def search_brain(
    brand_id: str,
    q: str,
    top_k: int = 4,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Vector similarity search over the brand knowledge store for RAG grounding."""
    return search_vector_chunks(db, brand_id, q, top_k=top_k)
