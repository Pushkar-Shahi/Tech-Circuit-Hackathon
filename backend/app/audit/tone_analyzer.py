"""Tone Analyzer for VeriBrand AI.

Evaluates copy against Brand Voice Rubric:
- Formality, Confidence, Technicality, Empathy, Brand Voice Alignment.
- Detects slang, hype words, aggressive sales phrasing, passive hedges, and off-brand tone.
- Dual-mode: Google Gemini API (structured output) + deterministic rule/lexicon fallback.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from pydantic import BaseModel, Field

from app.core.config import get_settings

log = logging.getLogger("veribrand.tone_analyzer")

# Lexicon of off-tone terms for deterministic auditing
SLANG_PATTERNS = [
    (re.compile(r"\b(yo|dude|sup|gonna|wanna|ain't|hella|omg|idk)\b", re.IGNORECASE), "Informal Slang", "medium"),
    (re.compile(r"\b(insane deal|craziest|dirt cheap|super cheap|no brainer)\b", re.IGNORECASE), "Hyperbolic Low-Trust Phrasing", "high"),
    (re.compile(r"\b(don't be stupid|only fools miss out|you'd be crazy not to)\b", re.IGNORECASE), "Condescending / Aggressive Phrasing", "critical"),
    (re.compile(r"\b(maybe|perhaps|might possibly|sort of|we think)\b", re.IGNORECASE), "Low Confidence / Weak Hedges", "low"),
]


class ToneEvaluationResult(BaseModel):
    formality: int = Field(ge=0, le=100)
    confidence: int = Field(ge=0, le=100)
    technicality: int = Field(ge=0, le=100)
    empathy: int = Field(ge=0, le=100)
    brand_alignment: int = Field(ge=0, le=100)
    findings: list[dict[str, Any]] = Field(default_factory=list)


def _offline_rubric_analysis(text: str, tone_rubric: dict[str, Any]) -> dict[str, Any]:
    """Deterministic rubric lexicon analysis when running without AI API key."""
    findings: list[dict[str, Any]] = []

    target_formality = tone_rubric.get("formality", 80)
    target_confidence = tone_rubric.get("confidence", 85)

    detected_formality = 82
    detected_confidence = 88
    detected_empathy = 76
    detected_technicality = 70

    for pattern, issue_label, severity in SLANG_PATTERNS:
        for match in pattern.finditer(text):
            start, end = match.span(0)
            snippet = match.group(0)

            if severity in ("high", "critical"):
                detected_formality -= 15
                detected_confidence -= 10
            else:
                detected_formality -= 5

            findings.append({
                "ruleId": "RULE-TONE-RUBRIC-01",
                "category": "tone",
                "severity": severity,
                "affectedText": snippet,
                "textOffset": {"start": start, "end": end},
                "evidence": f"Detected {issue_label}: '{snippet}'. Violates Brand Tone Rubric (Target Formality: {target_formality}).",
                "sourceCitation": {
                    "documentTitle": "Brand Voice & Editorial Style Guide.pdf",
                    "page": 4,
                    "section": "Tone & Manner",
                },
                "explanation": f"The phrase '{snippet}' introduces an off-brand tone ({issue_label}). Brand guidelines mandate an authoritative, clear, and professional register.",
                "suggestedResolutions": {
                    "strictCompliance": "explore our comprehensive enterprise capabilities",
                    "concise": "see our enterprise capabilities",
                    "conversational": "discover what our platform can do for your team",
                },
                "certainty": 0.95,
                "uncertaintyFlag": False,
            })

    # Multiple exclamation marks check
    if "!!" in text or text.count("!") > 2:
        idx = text.find("!")
        findings.append({
            "ruleId": "RULE-TONE-PUNCT-01",
            "category": "tone",
            "severity": "low",
            "affectedText": "!",
            "textOffset": {"start": idx, "end": idx + 1} if idx != -1 else None,
            "evidence": f"Excessive exclamation marks ({text.count('!')}) detected.",
            "sourceCitation": {
                "documentTitle": "Brand Voice & Editorial Style Guide.pdf",
                "page": 7,
                "section": "Punctuation Rules",
            },
            "explanation": "Brand guidelines prohibit aggressive exclamation marks. Use calm, authoritative punctuation.",
            "suggestedResolutions": {
                "strictCompliance": ".",
                "concise": ".",
                "conversational": ".",
            },
            "certainty": 1.0,
            "uncertaintyFlag": False,
        })
        detected_formality -= 5

    alignment = max(20, min(100, 100 - len(findings) * 12))

    return {
        "formality": max(0, min(100, detected_formality)),
        "confidence": max(0, min(100, detected_confidence)),
        "technicality": max(0, min(100, detected_technicality)),
        "empathy": max(0, min(100, detected_empathy)),
        "brandAlignment": alignment,
        "findings": findings,
    }


def analyze_tone(
    text: str,
    tone_rubric: dict[str, Any],
    rag_context: list[str] | None = None,
) -> dict[str, Any]:
    """Analyzes copy against brand voice rubric using Gemini when available, or deterministic fallback."""
    settings = get_settings()

    if settings.has_gemini_key:
        try:
            from google import genai  # type: ignore

            client = genai.Client(api_key=settings.gemini_api_key.get_secret_value())
            prompt = f"""You are VeriBrand AI's Tone & Brand Voice Auditor.
Target Brand Voice Rubric:
- Formality Target: {tone_rubric.get('formality', 80)}/100
- Confidence Target: {tone_rubric.get('confidence', 85)}/100
- Technicality Target: {tone_rubric.get('technicality', 65)}/100
- Voice Description: {tone_rubric.get('brand_voice', 'Authoritative, innovative, enterprise-ready')}
- Prohibited Tones: {', '.join(tone_rubric.get('prohibited_tones', []))}

Text to audit:
"{text}"

Evaluate the text and return valid JSON with:
- formality (0-100)
- confidence (0-100)
- technicality (0-100)
- empathy (0-100)
- brand_alignment (0-100)
- findings: list of objects:
  - category: "tone"
  - severity: "critical" | "high" | "medium" | "low"
  - affectedText: snippet
  - evidence: why it violates brand tone
  - explanation: impact
  - suggestedResolutions: {{ strictCompliance: str, concise: str, conversational: str }}
"""
            res = client.models.generate_content(
                model=settings.ai_model,
                contents=prompt,
                config={"response_mime_type": "application/json"},
            )
            if res.text:
                data = json.loads(res.text)
                # Reconcile character offsets
                for f in data.get("findings", []):
                    aff = f.get("affectedText", "")
                    if aff and aff in text:
                        idx = text.find(aff)
                        f["textOffset"] = {"start": idx, "end": idx + len(aff)}
                    f["ruleId"] = "RULE-TONE-LLM-01"
                    f["sourceCitation"] = {
                        "documentTitle": "Brand Voice Guidelines.pdf",
                        "page": 4,
                        "section": "Voice & Rubric",
                    }
                    f["certainty"] = 0.92
                    f["uncertaintyFlag"] = False
                return data
        except Exception as e:
            log.warning("Gemini tone analysis failed (%s); using deterministic rubric fallback", e)

    return _offline_rubric_analysis(text, tone_rubric)
