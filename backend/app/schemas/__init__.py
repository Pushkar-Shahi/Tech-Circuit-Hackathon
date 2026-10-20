"""Pydantic v2 schemas for VeriBrand AI.

Wire format uses camelCase keys to interface seamlessly with TypeScript frontend.
"""

from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class Camel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


# ---------------------------------------------------------------------------
# Brand & Organization Schemas
# ---------------------------------------------------------------------------

class ToneRubric(Camel):
    formality: int = Field(default=80, ge=0, le=100)
    confidence: int = Field(default=85, ge=0, le=100)
    technicality: int = Field(default=65, ge=0, le=100)
    empathy: int = Field(default=75, ge=0, le=100)
    brand_voice: str = Field(default="Authoritative, innovative, clear, enterprise-grade, never aggressive or colloquial")
    prohibited_tones: list[str] = Field(default_factory=lambda: ["slang", "hyperbolic", "condescending", "passive-aggressive"])


class BrandIdentity(Camel):
    primary_color: str = "#0A192F"
    secondary_color: str = "#00D2DF"
    accent_color: str = "#8B5CF6"
    font_family: str = "Inter"
    logo_url: str = "/logo.svg"


class Brand(Camel):
    id: str
    org_id: str
    name: str
    slug: str
    description: str
    tone_rubric: dict[str, Any] = Field(default_factory=dict)
    identity: dict[str, Any] = Field(default_factory=dict)
    created_by: str
    created_at: str
    updated_at: str


class BrandCreate(Camel):
    name: str
    slug: str
    description: str = ""
    tone_rubric: dict[str, Any] = Field(default_factory=dict)
    identity: dict[str, Any] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Knowledge & Brand Brain Schemas
# ---------------------------------------------------------------------------

class KnowledgeDoc(Camel):
    id: str
    brand_id: str
    title: str
    document_type: str
    file_path: str
    file_size: int
    mime_type: str
    status: str
    extracted_metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: str


class KnowledgeChunk(Camel):
    id: str
    brand_id: str
    document_id: str | None = None
    category: str
    content: str
    page_number: int | None = None
    section_title: str | None = None
    created_at: str


class FactItem(Camel):
    id: str
    brand_id: str
    document_id: str | None = None
    category: Literal["pricing", "product_name", "statistic", "legal_disclaimer", "prohibited_term", "deprecated_term"]
    canonical_value: str
    aliases_or_deprecated: list[str] = Field(default_factory=list)
    severity_if_violated: Literal["critical", "high", "medium", "low"] = "critical"
    source_citation: dict[str, Any] = Field(default_factory=dict)
    status: Literal["active", "deprecated", "prohibited"] = "active"
    created_at: str


class FactItemCreate(Camel):
    category: Literal["pricing", "product_name", "statistic", "legal_disclaimer", "prohibited_term", "deprecated_term"]
    canonical_value: str
    aliases_or_deprecated: list[str] = Field(default_factory=list)
    severity_if_violated: Literal["critical", "high", "medium", "low"] = "critical"
    source_citation: dict[str, Any] = Field(default_factory=dict)
    status: Literal["active", "deprecated", "prohibited"] = "active"


class VisualAsset(Camel):
    id: str
    brand_id: str
    document_id: str | None = None
    asset_type: Literal["color", "font", "logo", "dimension"]
    name: str
    specs: dict[str, Any] = Field(default_factory=dict)
    status: str = "approved"
    created_at: str


class BrandRule(Camel):
    id: str
    brand_id: str
    name: str
    description: str
    pillar: Literal["fact", "tone", "visual", "legal"]
    severity: Literal["critical", "high", "medium", "low"]
    source_document_id: str | None = None
    source_page: int | None = None
    source_section: str | None = None
    status: Literal["active", "draft", "deprecated"] = "active"
    version: int = 1
    conflict_status: dict[str, Any] = Field(default_factory=dict)
    created_at: str
    updated_at: str


class RuleUpdate(Camel):
    name: str | None = None
    description: str | None = None
    severity: Literal["critical", "high", "medium", "low"] | None = None
    status: Literal["active", "draft", "deprecated"] | None = None
    change_reason: str = ""


# ---------------------------------------------------------------------------
# Campaign & Multimodal Audit Schemas
# ---------------------------------------------------------------------------

class RewriteOptions(Camel):
    strict_compliance: str = ""
    concise: str = ""
    conversational: str = ""


class AuditFinding(Camel):
    id: str
    campaign_id: str
    revision_id: str
    rule_id: str | None = None
    category: Literal["factual", "tone", "visual", "legal"]
    severity: Literal["critical", "high", "medium", "low"]
    affected_text: str | None = None
    text_offset: dict[str, int] | None = None  # {start, end}
    visual_location: dict[str, Any] | None = None  # {page, bbox: [x, y, w, h]}
    evidence: str
    source_citation: dict[str, Any] = Field(default_factory=dict)
    explanation: str
    suggested_resolutions: RewriteOptions = Field(default_factory=RewriteOptions)
    certainty: float = 1.0
    uncertainty_flag: bool = False
    status: Literal["open", "accepted", "rejected", "overridden"] = "open"
    created_at: str
    updated_at: str


class ScoreBreakdown(Camel):
    factual_deductions: float = 0.0
    visual_deductions: float = 0.0
    tone_deductions: float = 0.0
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0
    penalty_details: list[dict[str, Any]] = Field(default_factory=list)


class CampaignRevision(Camel):
    id: str
    campaign_id: str
    revision_number: int
    content_text: str
    asset_urls: list[str] = Field(default_factory=list)
    brand_readiness_score: float = 100.0
    score_breakdown: ScoreBreakdown = Field(default_factory=ScoreBreakdown)
    fast_track_eligible: bool = False
    created_by: str
    created_at: str
    change_summary: str = ""


class Campaign(Camel):
    id: str
    org_id: str
    brand_id: str
    name: str
    channel: str
    department: str
    region: str
    agency: str
    target_audience: str
    status: Literal["draft", "scanning", "needs_revision", "pending_manager", "pending_specialist", "approved", "published"]
    created_by: str
    created_at: str
    updated_at: str
    latest_revision: CampaignRevision | None = None
    findings: list[AuditFinding] = Field(default_factory=list)


class CampaignCreate(Camel):
    brand_id: str
    name: str
    channel: str = "social_ad"
    department: str = "Growth Marketing"
    region: str = "Global"
    agency: str = "Internal Team"
    target_audience: str = "Enterprise Decision Makers"
    content_text: str
    asset_urls: list[str] = Field(default_factory=list)


class AcceptRewriteRequest(Camel):
    finding_id: str
    rewrite_mode: Literal["strict_compliance", "concise", "conversational", "custom"]
    custom_text: str | None = None


class OverrideRequest(Camel):
    finding_id: str
    justification: str
    risk_acknowledged: bool = True


class FindingOverride(Camel):
    id: str
    finding_id: str
    campaign_id: str
    rule_id: str | None = None
    requested_by: str
    justification: str
    status: Literal["pending", "approved", "rejected"]
    decided_by: str | None = None
    decision_note: str | None = None
    decided_at: str | None = None
    created_at: str


class WorkflowTransitionRequest(Camel):
    target_status: Literal["needs_revision", "pending_manager", "pending_specialist", "approved", "published"]
    reason: str = ""


# ---------------------------------------------------------------------------
# Comments & Governance Audit
# ---------------------------------------------------------------------------

class GovernanceComment(Camel):
    id: str
    campaign_id: str
    finding_id: str | None = None
    author: str
    body: str
    mentions: list[str] = Field(default_factory=list)
    created_at: str


class CommentCreate(Camel):
    body: str
    finding_id: str | None = None
    mentions: list[str] = Field(default_factory=list)


class GovernanceAuditEntry(Camel):
    seq: int
    id: str
    ts: str
    actor_name: str
    actor_role: str
    action: str
    target_type: str
    target_id: str
    before_state: Any = None
    after_state: Any = None
    prev_hash: str
    hash: str


# ---------------------------------------------------------------------------
# Analytics & Friction Detector
# ---------------------------------------------------------------------------

class FrictionRecommendation(Camel):
    rule_id: str
    rule_name: str
    pillar: str
    override_count: int
    total_violations: int
    override_rate: float
    recommendation: str
    sample_justifications: list[str] = Field(default_factory=list)


class GovernanceAnalytics(Camel):
    overall_readiness_score: float
    total_campaigns: int
    approved_count: int
    pending_count: int
    critical_violations_count: int
    compliance_trends: list[dict[str, Any]] = Field(default_factory=list)
    drift_heatmap: list[dict[str, Any]] = Field(default_factory=list)
    breakdown_by_channel: dict[str, int] = Field(default_factory=dict)
    breakdown_by_department: dict[str, int] = Field(default_factory=dict)
    rule_friction_reports: list[FrictionRecommendation] = Field(default_factory=list)
