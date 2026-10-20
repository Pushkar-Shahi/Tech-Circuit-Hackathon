"""Seed script for VeriBrand AI.

Populates realistic enterprise demo data for 'Acme Cloud Technologies':
- Multi-brand setup & tone rubrics
- Knowledge documents & vector store chunks
- Fact Registry (pricing, deprecated names, banned terms, disclaimers)
- Visual Asset Registry (colors, fonts, logos)
- Versioned rules with cross-document citations
- Campaigns across all workflow states:
  * Draft with live violations ready for review & rewrites
  * Pending Manager review with override justification
  * Approved via Fast-Track (score 98.0)
  * Published campaign
- Cryptographic SHA-256 audit log
- Historical override data to trigger the Rule Friction Detector
"""

from __future__ import annotations

import logging
from pathlib import Path
import sys

# Ensure backend directory is in sys.path
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.audit.orchestrator import calculate_brand_readiness_score
from app.db.init import init_db
from app.db.models import (
    AuditFindingRow,
    Base,
    BrandRow,
    CampaignRevisionRow,
    CampaignRow,
    FactRegistryRow,
    FindingOverrideRow,
    GovernanceAuditRow,
    GovernanceCommentRow,
    KnowledgeChunkRow,
    KnowledgeDocRow,
    OrganizationRow,
    RuleRow,
    VisualAssetRow,
    utcnow,
)
from app.db.session import engine, session_scope
from app.ingest.rule_compiler import compile_rules_from_facts_and_visuals
from app.ingest.vector_store import generate_embedding
from app.workflow.audit_logger import log_governance_event

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("veribrand.seed")


def seed_demo_data():
    eng = engine()
    Base.metadata.create_all(eng)

    with session_scope() as db:
        log.info("Seeding VeriBrand AI demo data...")

        # 1. Organization
        org = db.get(OrganizationRow, "org_acme")
        if not org:
            org = OrganizationRow(
                id="org_acme",
                name="Acme Cloud Technologies Inc.",
                slug="acme-cloud",
                scoring_config={
                    "factualWeight": 25.0,
                    "visualWeight": 12.0,
                    "toneWeight": 5.0,
                    "fastTrackThreshold": 95.0,
                    "frictionOverrideThreshold": 0.25,
                },
                created_at=utcnow(),
            )
            db.add(org)
            db.flush()

        # 2. Brands
        brand = db.get(BrandRow, "BRAND-ACME-01")
        if not brand:
            brand = BrandRow(
                id="BRAND-ACME-01",
                org_id="org_acme",
                name="Acme Cloud Enterprise",
                slug="acme-cloud-enterprise",
                description="Enterprise-grade cloud infrastructure, sovereign AI workloads, and mission-critical reliability.",
                tone_rubric={
                    "formality": 85,
                    "confidence": 90,
                    "technicality": 70,
                    "empathy": 80,
                    "brand_voice": "Authoritative, forward-looking, clear, enterprise-grade, never casual or sensationalist",
                    "prohibited_tones": ["slang", "hyperbolic", "condescending", "passive-aggressive"],
                },
                identity={
                    "primaryColor": "#0A192F",
                    "secondaryColor": "#00D2DF",
                    "accentColor": "#8B5CF6",
                    "fontFamily": "Inter",
                    "logoUrl": "/logo.svg",
                },
                created_by="Elena Vance",
                created_at=utcnow(),
                updated_at=utcnow(),
            )
            db.add(brand)
            db.flush()

        # 3. Knowledge Documents
        doc_pdf = db.get(KnowledgeDocRow, "DOC-GUIDELINES-01")
        if not doc_pdf:
            doc_pdf = KnowledgeDocRow(
                id="DOC-GUIDELINES-01",
                brand_id="BRAND-ACME-01",
                title="Acme Global Brand Guidelines 2026.pdf",
                document_type="brand_guidelines_pdf",
                file_path="/data/uploads/Acme_Brand_Guidelines_2026.pdf",
                file_size=2450000,
                mime_type="application/pdf",
                status="parsed",
                extracted_metadata={
                    "pageCount": 42,
                    "extractedColors": ["#0A192F", "#00D2DF", "#8B5CF6", "#FFFFFF"],
                    "extractedFonts": ["Inter", "Inter Display", "JetBrains Mono"],
                },
                created_at=utcnow(),
            )
            db.add(doc_pdf)

        doc_csv = db.get(KnowledgeDocRow, "DOC-PRICING-01")
        if not doc_csv:
            doc_csv = KnowledgeDocRow(
                id="DOC-PRICING-01",
                brand_id="BRAND-ACME-01",
                title="Acme Product Pricing & Legal Fact Sheet Q4.csv",
                document_type="product_fact_sheet_csv",
                file_path="/data/uploads/Acme_Product_Pricing_Q4.csv",
                file_size=45000,
                mime_type="text/csv",
                status="parsed",
                extracted_metadata={"rowCount": 14},
                created_at=utcnow(),
            )
            db.add(doc_csv)
            db.flush()

        # 4. Vector Store Knowledge Chunks
        chunks_data = [
            ("brand_voice", "Acme Cloud speaks with authoritative clarity and technical precision. We avoid hyperbole, gimmicks, or colloquial slang. Every capability must be backed by verifiable performance benchmarks.", 1, "Tone & Voice"),
            ("audience_persona", "Target audience consists of Chief Information Officers, VP of Engineering, and Cloud Architects managing critical infrastructure. They prioritize security, deterministic latency, and compliance.", 2, "Audience Personas"),
            ("campaign_example", "Approved headline template: 'Accelerate sovereign AI deployment with guaranteed 99.99% SLA uptime and SOC 2 Type II compliance.'", 5, "Approved Campaigns"),
            ("style_guide", "Punctuation rule: Never use more than one exclamation mark per asset. Disclaimers must accompany any numerical pricing tier mention.", 7, "Punctuation & Disclaimers"),
        ]
        for idx, (cat, content, pg, sec) in enumerate(chunks_data):
            chk_id = f"CHK-DEMO-{idx+1:02d}"
            if not db.get(KnowledgeChunkRow, chk_id):
                chunk = KnowledgeChunkRow(
                    id=chk_id,
                    brand_id="BRAND-ACME-01",
                    document_id="DOC-GUIDELINES-01",
                    category=cat,
                    content=content,
                    page_number=pg,
                    section_title=sec,
                    embedding=generate_embedding(content),
                    created_at=utcnow(),
                )
                db.add(chunk)

        # 5. Fact Registry Items
        facts_data = [
            ("FACT-PRO-PRICE", "pricing", "$49/seat/month billed annually", ["$39/mo", "$39/seat/mo", "$45/mo"], "critical", "Q4 Pricing Schedule.csv", 1, "Pro Tier"),
            ("FACT-ENT-PRICE", "pricing", "$149/seat/month billed annually", ["$129/mo", "$99/mo", "$99/seat/mo"], "critical", "Q4 Pricing Schedule.csv", 1, "Enterprise Tier"),
            ("FACT-UNHACKABLE", "prohibited_term", "100% unhackable", ["unhackable", "bulletproof security", "guaranteed zero hacks"], "critical", "Legal Guidelines.pdf", 4, "Prohibited Claims"),
            ("FACT-NAME-PRO", "product_name", "Acme Cloud Pro", ["Acme Cloud Legacy", "Acme 2024", "Acme Starter"], "high", "Product Architecture.pdf", 2, "Product Naming"),
            ("FACT-DISCLAIMER-01", "legal_disclaimer", "Subject to annual billing commitment. Minimum 5 seats required for Enterprise tier.", ["*Terms apply"], "critical", "Legal Guidelines.pdf", 8, "Mandatory Disclaimers"),
            ("FACT-STAT-UPTIME", "statistic", "99.99% SLA uptime across global enterprise regions", ["99.999%", "zero downtime forever"], "high", "SLA Specification.pdf", 3, "Uptime Benchmarks"),
        ]
        for f_id, cat, canon, aliases, sev, doc_t, pg, sec in facts_data:
            if not db.get(FactRegistryRow, f_id):
                fact = FactRegistryRow(
                    id=f_id,
                    brand_id="BRAND-ACME-01",
                    document_id="DOC-PRICING-01",
                    category=cat,
                    canonical_value=canon,
                    aliases_or_deprecated=aliases,
                    severity_if_violated=sev,
                    source_citation={"documentTitle": doc_t, "page": pg, "section": sec},
                    status="active",
                    created_at=utcnow(),
                )
                db.add(fact)

        # 6. Visual Asset Registry Items
        visuals_data = [
            ("VIS-COLOR-NAVY", "color", "Acme Deep Navy", {"hex": "#0A192F", "role": "primary", "max_delta_e": 8.0}),
            ("VIS-COLOR-CYAN", "color", "Electric Cyan", {"hex": "#00D2DF", "role": "secondary", "max_delta_e": 10.0}),
            ("VIS-COLOR-WHITE", "color", "Pure White", {"hex": "#FFFFFF", "role": "background", "max_delta_e": 2.0}),
            ("VIS-FONT-INTER", "font", "Inter Display", {"family": "Inter", "allowed_weights": [400, 500, 600, 700]}),
            ("VIS-LOGO-PRIMARY", "logo", "Acme Primary Horizontal", {"min_safe_zone_pct": 0.20, "min_width_px": 120, "allowed_aspect_ratio": 3.5}),
        ]
        for v_id, atype, name, specs in visuals_data:
            if not db.get(VisualAssetRow, v_id):
                asset = VisualAssetRow(
                    id=v_id,
                    brand_id="BRAND-ACME-01",
                    document_id="DOC-GUIDELINES-01",
                    asset_type=atype,
                    name=name,
                    specs=specs,
                    status="approved",
                    created_at=utcnow(),
                )
                db.add(asset)

        db.flush()
        # Compile rules
        compile_rules_from_facts_and_visuals(db, "BRAND-ACME-01")

        # 7. Seed Campaigns across all 5 Pillars
        # Campaign 1: DRAFT WITH LIVE VIOLATIONS (For user interactive testing)
        c1 = db.get(CampaignRow, "CAMP-DEMO-01")
        if not c1:
            c1 = CampaignRow(
                id="CAMP-DEMO-01",
                org_id="org_acme",
                brand_id="BRAND-ACME-01",
                name="Q4 Global Enterprise Migration Ad",
                channel="social_ad",
                department="Growth Marketing",
                region="North America",
                agency="Internal Team",
                target_audience="Enterprise CIOs & Technical Decision Makers",
                status="needs_revision",
                created_by="Liam Chen",
                created_at=utcnow(),
                updated_at=utcnow(),
            )
            db.add(c1)
            db.flush()

            c1_text = (
                "Yo check this out! Acme Cloud Legacy is now just $39/seat/mo. "
                "It is 100% unhackable and delivers crazy fast speeds!!"
            )
            r1 = CampaignRevisionRow(
                id="REV-DEMO-01",
                campaign_id="CAMP-DEMO-01",
                revision_number=1,
                content_text=c1_text,
                asset_urls=["/sample_creative_orange.png"],
                brand_readiness_score=38.0,
                score_breakdown={
                    "factualDeductions": 50.0,
                    "visualDeductions": 7.2,
                    "toneDeductions": 4.8,
                    "criticalCount": 3,
                    "highCount": 2,
                    "mediumCount": 1,
                    "lowCount": 1,
                },
                fast_track_eligible=False,
                created_by="Liam Chen",
                created_at=utcnow(),
                change_summary="Initial copy draft",
            )
            db.add(r1)
            db.flush()

            # Seed findings for Campaign 1
            findings_c1 = [
                AuditFindingRow(
                    id="FIND-DEMO-01",
                    campaign_id="CAMP-DEMO-01",
                    revision_id="REV-DEMO-01",
                    rule_id="RULE-FACT-FACT-P",
                    category="factual",
                    severity="critical",
                    affected_text="$39/seat/mo",
                    text_offset={"start": c1_text.find("$39/seat/mo"), "end": c1_text.find("$39/seat/mo") + len("$39/seat/mo")},
                    evidence="Detected outdated price '$39/seat/mo'. Canonical active price is '$49/seat/month billed annually'.",
                    source_citation={"documentTitle": "Q4 Pricing Schedule.csv", "page": 1, "section": "Pro Tier"},
                    explanation="Price '$39/seat/mo' was superseded in Q4. Advertising incorrect pricing exposes the company to billing disputes.",
                    suggested_resolutions={
                        "strictCompliance": "$49/seat/month billed annually",
                        "concise": "$49/seat/mo",
                        "conversational": "starting at just $49/seat/mo",
                    },
                    certainty=0.98,
                    status="open",
                    created_at=utcnow(),
                    updated_at=utcnow(),
                ),
                AuditFindingRow(
                    id="FIND-DEMO-02",
                    campaign_id="CAMP-DEMO-01",
                    revision_id="REV-DEMO-01",
                    rule_id="RULE-FACT-FACT-U",
                    category="legal",
                    severity="critical",
                    affected_text="100% unhackable",
                    text_offset={"start": c1_text.find("100% unhackable"), "end": c1_text.find("100% unhackable") + len("100% unhackable")},
                    evidence="Prohibited term detected: '100% unhackable'. Strict absolute security claims are prohibited.",
                    source_citation={"documentTitle": "Legal Guidelines.pdf", "page": 4, "section": "Prohibited Claims"},
                    explanation="Stating that cloud infrastructure is '100% unhackable' violates FTC advertising regulations and exposes Acme to liability.",
                    suggested_resolutions={
                        "strictCompliance": "enterprise-grade security architecture certified by SOC 2 Type II",
                        "concise": "SOC 2 Type II certified security",
                        "conversational": "built with multi-layered, enterprise-tested security",
                    },
                    certainty=1.0,
                    status="open",
                    created_at=utcnow(),
                    updated_at=utcnow(),
                ),
                AuditFindingRow(
                    id="FIND-DEMO-03",
                    campaign_id="CAMP-DEMO-01",
                    revision_id="REV-DEMO-01",
                    rule_id="RULE-FACT-FACT-N",
                    category="factual",
                    severity="high",
                    affected_text="Acme Cloud Legacy",
                    text_offset={"start": c1_text.find("Acme Cloud Legacy"), "end": c1_text.find("Acme Cloud Legacy") + len("Acme Cloud Legacy")},
                    evidence="Deprecated product name 'Acme Cloud Legacy'. Active canonical name is 'Acme Cloud Pro'.",
                    source_citation={"documentTitle": "Product Architecture.pdf", "page": 2, "section": "Product Naming"},
                    explanation="'Acme Cloud Legacy' is an obsolete product moniker. Marketing must consistently reinforce current brand naming.",
                    suggested_resolutions={
                        "strictCompliance": "Acme Cloud Pro",
                        "concise": "Acme Cloud Pro",
                        "conversational": "Acme Cloud Pro",
                    },
                    certainty=0.95,
                    status="open",
                    created_at=utcnow(),
                    updated_at=utcnow(),
                ),
                AuditFindingRow(
                    id="FIND-DEMO-04",
                    campaign_id="CAMP-DEMO-01",
                    revision_id="REV-DEMO-01",
                    rule_id="RULE-TONE-RUBRIC-01",
                    category="tone",
                    severity="medium",
                    affected_text="Yo check this out!",
                    text_offset={"start": c1_text.find("Yo check this out!"), "end": c1_text.find("Yo check this out!") + len("Yo check this out!")},
                    evidence="Informal slang detected: 'Yo check this out!'. Target brand formality is 85/100.",
                    source_citation={"documentTitle": "Brand Guidelines 2026.pdf", "page": 4, "section": "Tone & Voice"},
                    explanation="Slang undermines executive enterprise trust. Acme Cloud speaks with authoritative precision.",
                    suggested_resolutions={
                        "strictCompliance": "Discover how Acme Cloud streamlines your infrastructure.",
                        "concise": "Upgrade your infrastructure.",
                        "conversational": "Take a look at what modern cloud infrastructure can do for you.",
                    },
                    certainty=0.94,
                    status="open",
                    created_at=utcnow(),
                    updated_at=utcnow(),
                ),
                AuditFindingRow(
                    id="FIND-DEMO-05",
                    campaign_id="CAMP-DEMO-01",
                    revision_id="REV-DEMO-01",
                    rule_id="RULE-FACT-DISCLAIMER-01",
                    category="legal",
                    severity="critical",
                    affected_text=None,
                    text_offset=None,
                    evidence="Mandatory pricing disclaimer missing: 'Subject to annual billing commitment.'",
                    source_citation={"documentTitle": "Legal Guidelines.pdf", "page": 8, "section": "Mandatory Disclaimers"},
                    explanation="Any collateral quoting subscription rates must disclose annual billing commitment terms.",
                    suggested_resolutions={
                        "strictCompliance": "*Subject to annual billing commitment. Minimum 5 seats required for Enterprise tier.",
                        "concise": "*Annual billing applies.",
                        "conversational": "*Billed annually, terms apply.",
                    },
                    certainty=1.0,
                    status="open",
                    created_at=utcnow(),
                    updated_at=utcnow(),
                ),
            ]
            for f in findings_c1:
                db.add(f)

        # Campaign 2: PENDING MANAGER REVIEW WITH OVERRIDE REQUEST
        c2 = db.get(CampaignRow, "CAMP-DEMO-02")
        if not c2:
            c2 = CampaignRow(
                id="CAMP-DEMO-02",
                org_id="org_acme",
                brand_id="BRAND-ACME-01",
                name="APAC Regional Launch Email Campaign",
                channel="email_newsletter",
                department="Regional Sales",
                region="APAC",
                agency="Apex Digital",
                target_audience="Regional Technology Directors",
                status="pending_manager",
                created_by="Liam Chen",
                created_at=utcnow(),
                updated_at=utcnow(),
            )
            db.add(c2)
            db.flush()

            r2_text = (
                "Transform your sovereign cloud infrastructure with Acme Cloud Enterprise. "
                "Enjoy customized tiered pricing tailored for regional banking compliance. "
                "*Subject to annual billing commitment."
            )
            r2 = CampaignRevisionRow(
                id="REV-DEMO-02",
                campaign_id="CAMP-DEMO-02",
                revision_number=2,
                content_text=r2_text,
                brand_readiness_score=87.5,
                score_breakdown={"factualDeductions": 7.5, "visualDeductions": 0.0, "toneDeductions": 5.0, "criticalCount": 0},
                fast_track_eligible=False,
                created_by="Liam Chen",
                created_at=utcnow(),
                change_summary="Submitted override request for regional banking terms",
            )
            db.add(r2)
            db.flush()

            f_ovr = AuditFindingRow(
                id="FIND-DEMO-OVR-01",
                campaign_id="CAMP-DEMO-02",
                revision_id="REV-DEMO-02",
                rule_id="RULE-FACT-DISCLAIMER-01",
                category="legal",
                severity="medium",
                affected_text="*Subject to annual billing commitment.",
                text_offset={"start": r2_text.find("*Subject"), "end": len(r2_text)},
                evidence="Condensed disclaimer variant used instead of 30-word standard disclaimer.",
                source_citation={"documentTitle": "Legal Guidelines.pdf", "page": 8, "section": "Disclaimers"},
                explanation="Standard disclaimer truncated for email layout balance.",
                suggested_resolutions={
                    "strictCompliance": "*Subject to annual billing commitment. Minimum 5 seats required for Enterprise tier.",
                    "concise": "*Annual billing applies.",
                    "conversational": "*Billed annually, terms apply.",
                },
                certainty=0.9,
                status="open",
                created_at=utcnow(),
                updated_at=utcnow(),
            )
            db.add(f_ovr)

            override = FindingOverrideRow(
                id="OVR-DEMO-01",
                finding_id="FIND-DEMO-OVR-01",
                campaign_id="CAMP-DEMO-02",
                rule_id="RULE-FACT-DISCLAIMER-01",
                requested_by="Liam Chen",
                justification="In APAC email newsletter templates, the 30-word legal disclaimer breaks mobile email layout and gets clipped in Gmail. The condensed form has verbal pre-clearance from regional counsel.",
                status="pending",
                created_at=utcnow(),
            )
            db.add(override)

        # Campaign 3: APPROVED VIA FAST-TRACK
        c3 = db.get(CampaignRow, "CAMP-DEMO-03")
        if not c3:
            c3 = CampaignRow(
                id="CAMP-DEMO-03",
                org_id="org_acme",
                brand_id="BRAND-ACME-01",
                name="Sovereign AI Infrastructure Landing Page",
                channel="landing_page",
                department="Product Marketing",
                region="Global",
                agency="Internal Team",
                target_audience="Enterprise CIOs",
                status="approved",
                created_by="Marcus Sterling",
                created_at=utcnow(),
                updated_at=utcnow(),
            )
            db.add(c3)
            db.flush()

            r3 = CampaignRevisionRow(
                id="REV-DEMO-03",
                campaign_id="CAMP-DEMO-03",
                revision_number=1,
                content_text="Deploy sovereign AI workloads on dedicated high-performance clusters. Acme Cloud Enterprise provides audited SOC 2 Type II compliance and verified 99.99% SLA uptime.",
                brand_readiness_score=98.0,
                score_breakdown={"factualDeductions": 0.0, "visualDeductions": 0.0, "toneDeductions": 2.0, "criticalCount": 0},
                fast_track_eligible=True,
                created_by="Marcus Sterling",
                created_at=utcnow(),
                change_summary="Fast-track automated approval (Score 98.0)",
            )
            db.add(r3)
            db.flush()

        # 8. Seed Historical Overrides for Rule Friction Detector
        # Seed 4 historical approved overrides on RULE-FACT-DISCLAIMER-01 to demonstrate the Friction Detector in action
        historical_overrides = [
            ("OVR-HIST-01", "RULE-FACT-DISCLAIMER-01", "Short-form mobile ad banner requires concise legal text.", "Sarah Jenkins"),
            ("OVR-HIST-02", "RULE-FACT-DISCLAIMER-01", "Twitter/X character limit requires abbreviated disclaimer.", "Sarah Jenkins"),
            ("OVR-HIST-03", "RULE-FACT-DISCLAIMER-01", "Co-marketing event poster with partner AWS requires concise variant.", "Sarah Jenkins"),
            ("OVR-HIST-04", "RULE-FACT-DISCLAIMER-01", "LinkedIn sponsored carousel text length limits.", "Marcus Sterling"),
        ]
        for o_id, r_id, just, mgr in historical_overrides:
            if not db.get(FindingOverrideRow, o_id):
                ovr = FindingOverrideRow(
                    id=o_id,
                    finding_id="FIND-DEMO-OVR-01",
                    campaign_id="CAMP-DEMO-02",
                    rule_id=r_id,
                    requested_by="Liam Chen",
                    justification=just,
                    status="approved",
                    decided_by=mgr,
                    decision_note="Approved for mobile character limits",
                    decided_at=utcnow(),
                    created_at=utcnow(),
                )
                db.add(ovr)

        # 9. Seed Cryptographic Audit Log Entries
        audit_events = [
            ("Elena Vance", "owner", "brand.create", "brand", "BRAND-ACME-01", {"name": "Acme Cloud Enterprise"}),
            ("Marcus Sterling", "admin", "brain.ingest", "document", "DOC-GUIDELINES-01", {"title": "Acme Global Brand Guidelines 2026.pdf"}),
            ("Marcus Sterling", "admin", "rules.compile", "rules", "BRAND-ACME-01", {"rulesCount": 12}),
            ("Liam Chen", "creator", "campaign.create", "campaign", "CAMP-DEMO-01", {"status": "draft"}),
            ("Liam Chen", "creator", "campaign.scan", "campaign", "CAMP-DEMO-01", {"findingsFound": 5, "score": 38.0}),
            ("Liam Chen", "creator", "override.request", "override", "OVR-DEMO-01", {"ruleId": "RULE-FACT-DISCLAIMER-01"}),
        ]
        for actor, role, action, target_type, target_id, state in audit_events:
            log_governance_event(
                db=db,
                actor_name=actor,
                actor_role=role,
                action=action,
                target_type=target_type,
                target_id=target_id,
                after_state=state,
            )

        db.commit()
        log.info("VeriBrand AI demo data seeded successfully!")


if __name__ == "__main__":
    seed_demo_data()
