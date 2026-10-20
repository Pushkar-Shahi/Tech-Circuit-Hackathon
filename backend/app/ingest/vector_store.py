"""Vector Knowledge Store for Brand Voice, Target Personas & Approved Copy.

Implements semantic chunking, embedding generation (Gemini embedding model with deterministic
portable fallback), and cosine similarity search for RAG grounding.
"""

from __future__ import annotations

import hashlib
import logging
import math
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import KnowledgeChunkRow

log = logging.getLogger("veribrand.vector_store")

EMBEDDING_DIM = 64


def _fallback_embedding(text: str, dim: int = EMBEDDING_DIM) -> list[float]:
    """Deterministic, normalized embedding vector from character/word n-grams.
    Ensures zero-dependency vector search capability in tests and offline environments.
    """
    clean = text.lower().strip()
    words = clean.split()
    vec = [0.0] * dim
    for i, word in enumerate(words):
        h = int(hashlib.sha256(word.encode()).hexdigest(), 16)
        idx = h % dim
        weight = 1.0 / (1.0 + math.log(1 + i))
        vec[idx] += weight
    for ch in clean:
        idx = ord(ch) % dim
        vec[idx] += 0.05
    # L2 normalize
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        return [round(x / norm, 5) for x in vec]
    return [0.0] * dim


def generate_embedding(text: str) -> list[float]:
    """Generate vector embedding for a text chunk."""
    settings = get_settings()
    if settings.has_gemini_key:
        try:
            from google import genai  # type: ignore

            client = genai.Client(api_key=settings.gemini_api_key.get_secret_value())
            res = client.models.embed_content(
                model="text-embedding-004",
                contents=text,
            )
            if hasattr(res, "embedding") and res.embedding and hasattr(res.embedding, "values"):
                # Take first 64 dimensions for uniform storage
                vals = res.embedding.values[:EMBEDDING_DIM]
                norm = math.sqrt(sum(x * x for x in vals))
                return [round(x / norm, 5) for x in vals] if norm > 0 else vals
        except Exception as e:
            log.warning("Gemini embedding call failed (%s); using deterministic fallback", e)
    return _fallback_embedding(text)


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two normalized vectors."""
    if not a or not b:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return max(-1.0, min(1.0, dot / (norm_a * norm_b)))


def chunk_text(text: str, chunk_size: int = 350, overlap: int = 50) -> list[str]:
    """Splits document text into overlapping semantic passages."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    for para in paragraphs:
        p_len = len(para)
        if current_len + p_len > chunk_size and current:
            chunk_str = " ".join(current)
            chunks.append(chunk_str)
            # Overlap: keep the last paragraph if possible
            current = [current[-1], para] if len(current) > 1 else [para]
            current_len = sum(len(p) for p in current)
        else:
            current.append(para)
            current_len += p_len

    if current:
        chunks.append(" ".join(current))
    return chunks or [text[:chunk_size]]


def search_vector_chunks(
    db: Session,
    brand_id: str,
    query: str,
    top_k: int = 4,
    category: str | None = None,
) -> list[dict[str, Any]]:
    """Retrieve top-K matching knowledge passages for RAG grounding."""
    stmt = select(KnowledgeChunkRow).where(KnowledgeChunkRow.brand_id == brand_id)
    if category:
        stmt = stmt.where(KnowledgeChunkRow.category == category)
    chunks = db.execute(stmt).scalars().all()
    if not chunks:
        return []

    q_vec = generate_embedding(query)
    scored = []
    for c in chunks:
        c_vec = c.embedding or _fallback_embedding(c.content)
        sim = cosine_similarity(q_vec, c_vec)
        scored.append((sim, c))

    scored.sort(key=lambda x: x[0], reverse=True)
    results = []
    for score, chunk in scored[:top_k]:
        results.append({
            "id": chunk.id,
            "category": chunk.category,
            "content": chunk.content,
            "pageNumber": chunk.page_number,
            "sectionTitle": chunk.section_title,
            "similarity": round(float(score), 4),
        })
    return results
