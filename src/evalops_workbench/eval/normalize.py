"""Answer-text normalization, following the SQuAD evaluation convention.

Normalization is the contract that makes scores comparable: "The Nile." and
"nile" must score as equal. Keeping it in one place means every scorer shares
the exact same notion of equality.
"""
from __future__ import annotations

import re
import string

_ARTICLES = re.compile(r"\b(a|an|the)\b", re.IGNORECASE)
_PUNCT_TABLE = str.maketrans("", "", string.punctuation)
_WHITESPACE = re.compile(r"\s+")


def normalize_answer(text: str) -> str:
    """Lowercase, strip punctuation and articles, collapse whitespace.

    Mirrors the SQuAD v1.1 official normalization so token-overlap F1 and
    exact-match scores match published methodology.
    """
    if not text:
        return ""
    lowered = text.lower()
    no_punct = lowered.translate(_PUNCT_TABLE)
    no_articles = _ARTICLES.sub(" ", no_punct)
    return _WHITESPACE.sub(" ", no_articles).strip()


def tokenize(text: str) -> list[str]:
    """Normalized whitespace tokens. Empty string yields an empty list."""
    normalized = normalize_answer(text)
    return normalized.split() if normalized else []
