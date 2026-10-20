"""VeriBrand AI — SQLAlchemy 2.0 Models.

Portable across PostgreSQL (with pgvector) and SQLite (with numpy/scipy cosine vector fallback).
Includes append-only SHA-256 hash chained governance audit log.
"""

from datetime import UTC, datetime
import hashlib
import json

from sqlalchemy import DDL, JSON, Boolean, Float, ForeignKey, Index, Integer, String, Text, event
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utcnow() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


class Base(DeclarativeBase):
    type_annotation_map = {dict: JSON, list: JSON}


# ---------------------------------------------------------------------------
# Organization & Multi-Brand Tenancy
# ---------------------------------------------------------------------------

class OrganizationRow(Base):
    __tablename__ = "organizations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    scoring_config: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[str] = mapped_column(String(30), default=utcnow)


class BrandRow(Base):
    __tablename__ = "brands"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(100), index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    tone_rubric: Mapped[dict] = mapped_column(JSON, default=dict)
    identity: Mapped[dict] = mapped_column(JSON, default=dict)
    created_by: Mapped[str] = mapped_column(String(120), default="System")
    created_at: Mapped[str] = mapped_column(String(30), default=utcnow)
    updated_at: Mapped[str] = mapped_column(String(30), default=utcnow)


# ---------------------------------------------------------------------------
# Pillar A: Ingestion & Knowledge Stores (Brand Brain)
# ---------------------------------------------------------------------------

class KnowledgeDocRow(Base):
    __tablename__ = "knowledge_documents"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    brand_id: Mapped[str] = mapped_column(ForeignKey("brands.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    document_type: Mapped[str] = mapped_column(String(50), index=True)
    file_path: Mapped[str] = mapped_column(String(500))
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    mime_type: Mapped[str] = mapped_column(String(100), default="application/pdf")
    status: Mapped[str] = mapped_column(String(30), default="parsed", index=True)
    extracted_metadata: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[str] = mapped_column(String(30), default=utcnow)


class KnowledgeChunkRow(Base):
    """Vector Knowledge Store chunks for Brand Voice, Target Personas & Approved Copy."""
    __tablename__ = "knowledge_chunks"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    brand_id: Mapped[str] = mapped_column(ForeignKey("brands.id", ondelete="CASCADE"), index=True)
    document_id: Mapped[str | None] = mapped_column(ForeignKey("knowledge_documents.id", ondelete="SET NULL"), nullable=True, index=True)
    category: Mapped[str] = mapped_column(String(50), index=True)  # brand_voice | audience_persona | campaign_example | style_guide
    content: Mapped[str] = mapped_column(Text)
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    section_title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    embedding: Mapped[list] = mapped_column(JSON, default=list)  # float vector
    created_at: Mapped[str] = mapped_column(String(30), default=utcnow)


class FactRegistryRow(Base):
    """Fact Registry: Verified pricing, product names, stats, legal disclaimers, banned terms."""
    __tablename__ = "fact_registry"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    brand_id: Mapped[str] = mapped_column(ForeignKey("brands.id", ondelete="CASCADE"), index=True)
    document_id: Mapped[str | None] = mapped_column(ForeignKey("knowledge_documents.id", ondelete="SET NULL"), nullable=True)
    category: Mapped[str] = mapped_column(String(50), index=True)  # pricing | product_name | statistic | legal_disclaimer | prohibited_term | deprecated_term
    canonical_value: Mapped[str] = mapped_column(Text)
    aliases_or_deprecated: Mapped[list] = mapped_column(JSON, default=list)
    severity_if_violated: Mapped[str] = mapped_column(String(20), default="critical")  # critical | high | medium | low
    source_citation: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)  # active | deprecated | prohibited
    created_at: Mapped[str] = mapped_column(String(30), default=utcnow)


class VisualAssetRow(Base):
    """Visual Asset Registry: Approved brand colors, typography, logos, dimensions, safe zones."""
    __tablename__ = "visual_asset_registry"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    brand_id: Mapped[str] = mapped_column(ForeignKey("brands.id", ondelete="CASCADE"), index=True)
    document_id: Mapped[str | None] = mapped_column(ForeignKey("knowledge_documents.id", ondelete="SET NULL"), nullable=True)
    asset_type: Mapped[str] = mapped_column(String(50), index=True)  # color | font | logo | dimension
    name: Mapped[str] = mapped_column(String(100))
    specs: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(20), default="approved", index=True)
    created_at: Mapped[str] = mapped_column(String(30), default=utcnow)


class RuleRow(Base):
    """Versioned Brand Rules with source citations and conflict detection status."""
    __tablename__ = "rules"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # e.g. RULE-FACT-01
    brand_id: Mapped[str] = mapped_column(ForeignKey("brands.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    pillar: Mapped[str] = mapped_column(String(30), index=True)  # fact | tone | visual | legal
    severity: Mapped[str] = mapped_column(String(20), default="critical", index=True)  # critical | high | medium | low
    source_document_id: Mapped[str | None] = mapped_column(ForeignKey("knowledge_documents.id", ondelete="SET NULL"), nullable=True)
    source_page: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source_section: Mapped[str | None] = mapped_column(String(200), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)  # active | draft | deprecated
    version: Mapped[int] = mapped_column(Integer, default=1)
    conflict_status: Mapped[dict] = mapped_column(JSON, default=dict)  # {has_conflict: bool, conflicting_rule_id, details}
    created_at: Mapped[str] = mapped_column(String(30), default=utcnow)
    updated_at: Mapped[str] = mapped_column(String(30), default=utcnow)


class RuleVersionRow(Base):
    __tablename__ = "rule_versions"
    pk: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    rule_id: Mapped[str] = mapped_column(ForeignKey("rules.id", ondelete="CASCADE"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    changed_by: Mapped[str] = mapped_column(String(120))
    changed_at: Mapped[str] = mapped_column(String(30), default=utcnow)
    before: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    after: Mapped[dict] = mapped_column(JSON)
    change_reason: Mapped[str] = mapped_column(Text, default="")


# ---------------------------------------------------------------------------
# Pillar B, C, D: Campaigns, Multimodal Audits & Copilot Workspace
# ---------------------------------------------------------------------------

class CampaignRow(Base):
    """Marketing campaign or content draft subject to brand governance."""
    __tablename__ = "campaigns"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    brand_id: Mapped[str] = mapped_column(ForeignKey("brands.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    channel: Mapped[str] = mapped_column(String(50), index=True)  # social_ad | email_newsletter | landing_page | display_banner | print_brochure
    department: Mapped[str] = mapped_column(String(100), default="Growth Marketing", index=True)
    region: Mapped[str] = mapped_column(String(50), default="Global", index=True)
    agency: Mapped[str] = mapped_column(String(100), default="Internal Team")
    target_audience: Mapped[str] = mapped_column(String(200), default="Enterprise B2B Decision Makers")
    status: Mapped[str] = mapped_column(String(30), default="draft", index=True)
    created_by: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[str] = mapped_column(String(30), default=utcnow)
    updated_at: Mapped[str] = mapped_column(String(30), default=utcnow)


class CampaignRevisionRow(Base):
    """Versioned snapshot of draft content, scores, and visual assets."""
    __tablename__ = "campaign_revisions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    campaign_id: Mapped[str] = mapped_column(ForeignKey("campaigns.id", ondelete="CASCADE"), index=True)
    revision_number: Mapped[int] = mapped_column(Integer, default=1)
    content_text: Mapped[str] = mapped_column(Text)
    asset_urls: Mapped[list] = mapped_column(JSON, default=list)  # list of uploaded creative images/PDFs
    brand_readiness_score: Mapped[float] = mapped_column(Float, default=100.0)
    score_breakdown: Mapped[dict] = mapped_column(JSON, default=dict)
    fast_track_eligible: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[str] = mapped_column(String(30), default=utcnow)
    change_summary: Mapped[str] = mapped_column(Text, default="Initial draft")


class AuditFindingRow(Base):
    """Multimodal audit findings from Fact Checker, Tone Analyzer, and Visual Inspector."""
    __tablename__ = "audit_findings"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # e.g. FIND-001
    campaign_id: Mapped[str] = mapped_column(ForeignKey("campaigns.id", ondelete="CASCADE"), index=True)
    revision_id: Mapped[str] = mapped_column(ForeignKey("campaign_revisions.id", ondelete="CASCADE"), index=True)
    rule_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    category: Mapped[str] = mapped_column(String(20), index=True)  # factual | tone | visual | legal
    severity: Mapped[str] = mapped_column(String(20), index=True)  # critical | high | medium | low
    affected_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    text_offset: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # {start: int, end: int}
    visual_location: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # {page, bbox: [x, y, w, h]}
    evidence: Mapped[str] = mapped_column(Text)
    source_citation: Mapped[dict] = mapped_column(JSON, default=dict)
    explanation: Mapped[str] = mapped_column(Text)
    suggested_resolutions: Mapped[dict] = mapped_column(JSON, default=dict)  # {strict_compliance, concise, conversational}
    certainty: Mapped[float] = mapped_column(Float, default=1.0)
    uncertainty_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="open", index=True)  # open | accepted | rejected | overridden
    created_at: Mapped[str] = mapped_column(String(30), default=utcnow)
    updated_at: Mapped[str] = mapped_column(String(30), default=utcnow)


class FindingOverrideRow(Base):
    """Override request with mandatory justification submitted to managers."""
    __tablename__ = "finding_overrides"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    finding_id: Mapped[str] = mapped_column(ForeignKey("audit_findings.id", ondelete="CASCADE"), index=True)
    campaign_id: Mapped[str] = mapped_column(ForeignKey("campaigns.id", ondelete="CASCADE"), index=True)
    rule_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    requested_by: Mapped[str] = mapped_column(String(120))
    justification: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)  # pending | approved | rejected
    decided_by: Mapped[str | None] = mapped_column(String(120), nullable=True)
    decision_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    decided_at: Mapped[str | None] = mapped_column(String(30), nullable=True)
    created_at: Mapped[str] = mapped_column(String(30), default=utcnow)


class GovernanceCommentRow(Base):
    __tablename__ = "governance_comments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    campaign_id: Mapped[str] = mapped_column(ForeignKey("campaigns.id", ondelete="CASCADE"), index=True)
    finding_id: Mapped[str | None] = mapped_column(ForeignKey("audit_findings.id", ondelete="SET NULL"), nullable=True, index=True)
    author: Mapped[str] = mapped_column(String(120))
    body: Mapped[str] = mapped_column(Text)
    mentions: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[str] = mapped_column(String(30), default=utcnow)


# ---------------------------------------------------------------------------
# Pillar E: Governance Tracking & Append-Only SHA-256 Audit Log
# ---------------------------------------------------------------------------

class GovernanceAuditRow(Base):
    """Append-only audit log protected by SHA-256 hash chaining and DB triggers."""
    __tablename__ = "governance_audit_log"
    seq: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    ts: Mapped[str] = mapped_column(String(30), default=utcnow, index=True)
    actor_name: Mapped[str] = mapped_column(String(120))
    actor_role: Mapped[str] = mapped_column(String(50))
    action: Mapped[str] = mapped_column(String(60), index=True)
    target_type: Mapped[str] = mapped_column(String(40))
    target_id: Mapped[str] = mapped_column(String(64), index=True)
    before_state: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    after_state: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    prev_hash: Mapped[str] = mapped_column(String(64))
    hash: Mapped[str] = mapped_column(String(64))


# Append-only enforcement for SQLite (DB triggers prevent UPDATE and DELETE)
for _op in ("UPDATE", "DELETE"):
    event.listen(
        GovernanceAuditRow.__table__,
        "after_create",
        DDL(
            f"CREATE TRIGGER IF NOT EXISTS audit_no_{_op.lower()} BEFORE {_op} ON governance_audit_log "
            "BEGIN SELECT RAISE(ABORT, 'governance_audit_log is append-only'); END;"
        ).execute_if(dialect="sqlite"),
    )
