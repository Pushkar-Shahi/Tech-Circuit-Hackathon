"""Diff Engine for VeriBrand AI.

Produces word-level and line-level diffs between original campaign copy and revised versions
for visual pull-request style review comparisons.
"""

from __future__ import annotations

import difflib
from typing import Any


def compute_word_diff(original: str, revised: str) -> list[dict[str, Any]]:
    """Generates word-level diff chunks (tag: 'equal' | 'delete' | 'insert', text)."""
    orig_words = original.split()
    rev_words = revised.split()

    matcher = difflib.SequenceMatcher(None, orig_words, rev_words)
    diff_chunks: list[dict[str, Any]] = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            diff_chunks.append({"type": "equal", "text": " ".join(orig_words[i1:i2])})
        elif tag == "delete":
            diff_chunks.append({"type": "delete", "text": " ".join(orig_words[i1:i2])})
        elif tag == "insert":
            diff_chunks.append({"type": "insert", "text": " ".join(rev_words[j1:j2])})
        elif tag == "replace":
            diff_chunks.append({"type": "delete", "text": " ".join(orig_words[i1:i2])})
            diff_chunks.append({"type": "insert", "text": " ".join(rev_words[j1:j2])})

    return diff_chunks


def compute_unified_diff(original: str, revised: str, from_label: str = "Original", to_label: str = "Revised") -> list[str]:
    """Generates unified diff lines."""
    orig_lines = original.splitlines(keepends=True)
    rev_lines = revised.splitlines(keepends=True)
    return list(difflib.unified_diff(orig_lines, rev_lines, fromfile=from_label, tofile=to_label))
