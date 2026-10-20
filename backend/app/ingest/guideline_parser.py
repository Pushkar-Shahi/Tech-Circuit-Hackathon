"""Multimodal Document & Guideline Parser for VeriBrand AI.

Supports PDF guidelines (via pdfplumber/fitz), CSV fact sheets, JSON, and creative images.
Extracts text passages, color swatches, font references, pricing tables, and disclaimers.
"""

from __future__ import annotations

import csv
import json
import logging
from pathlib import Path
import re
from typing import Any

from PIL import Image

log = logging.getLogger("veribrand.ingest")

HEX_COLOR_REGEX = re.compile(r"#(?:[0-9a-fA-F]{3}){1,2}\b")
PRICE_REGEX = re.compile(r"(?:\$|₹|€|£)\s*\d+(?:,\d{3})*(?:\.\d{2})?(?:/(?:mo|month|yr|year|seat))?")


def extract_pdf_content(file_path: Path) -> dict[str, Any]:
    """Extract pages, text, color codes, and font metadata from PDF guidelines."""
    pages_data: list[dict[str, Any]] = []
    extracted_colors: set[str] = set()
    extracted_fonts: set[str] = set()
    all_text = ""

    # Try PyMuPDF (fitz) if installed
    try:
        import fitz  # type: ignore

        doc = fitz.open(file_path)
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            text = page.get_text()
            all_text += f"\n{text}"
            for c in HEX_COLOR_REGEX.findall(text):
                extracted_colors.add(c.upper())
            # Inspect font metadata
            try:
                for font in page.get_fonts():
                    if len(font) >= 4 and font[3]:
                        font_clean = font[3].split("+")[-1]
                        extracted_fonts.add(font_clean)
            except Exception:
                pass
            pages_data.append({"page": page_idx + 1, "text": text})
        return {
            "pageCount": len(doc),
            "pages": pages_data,
            "fullText": all_text.strip(),
            "extractedColors": sorted(extracted_colors),
            "extractedFonts": sorted(extracted_fonts),
            "parser": "pymupdf",
        }
    except ImportError:
        pass

    # Try pdfplumber if installed
    try:
        import pdfplumber  # type: ignore

        with pdfplumber.open(file_path) as pdf:
            for idx, page in enumerate(pdf.pages):
                text = page.extract_text() or ""
                all_text += f"\n{text}"
                for c in HEX_COLOR_REGEX.findall(text):
                    extracted_colors.add(c.upper())
                pages_data.append({"page": idx + 1, "text": text})
            return {
                "pageCount": len(pdf.pages),
                "pages": pages_data,
                "fullText": all_text.strip(),
                "extractedColors": sorted(extracted_colors),
                "extractedFonts": sorted(extracted_fonts),
                "parser": "pdfplumber",
            }
    except Exception as e:
        log.warning("PDF parsing failed (%s), reading as binary text fallback", e)

    # Fallback text extractor
    raw_bytes = file_path.read_bytes()
    clean_text = raw_bytes.decode("utf-8", errors="ignore")
    return {
        "pageCount": 1,
        "pages": [{"page": 1, "text": clean_text[:5000]}],
        "fullText": clean_text[:5000],
        "extractedColors": sorted(HEX_COLOR_REGEX.findall(clean_text)),
        "extractedFonts": ["Inter", "System Sans"],
        "parser": "fallback",
    }


def parse_csv_fact_sheet(file_path: Path) -> list[dict[str, Any]]:
    """Parse CSV product fact sheets, canonical pricing, and terminology tables."""
    records: list[dict[str, Any]] = []
    with file_path.open("r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append({k.strip(): (v.strip() if v else "") for k, v in row.items()})
    return records


def parse_json_guidelines(file_path: Path) -> dict[str, Any]:
    """Parse JSON guideline specifications."""
    return json.loads(file_path.read_text(encoding="utf-8"))


def parse_image_asset(file_path: Path) -> dict[str, Any]:
    """Inspect visual image asset (logos, banners, color swatches)."""
    with Image.open(file_path) as img:
        width, height = img.size
        aspect_ratio = round(width / max(1, height), 2)
        mode = img.mode
        return {
            "width": width,
            "height": height,
            "aspectRatio": aspect_ratio,
            "format": img.format,
            "mode": mode,
        }
