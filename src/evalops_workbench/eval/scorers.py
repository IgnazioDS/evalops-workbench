"""Rubric functions: exact match, token-overlap F1, and gold containment.

Each scorer takes a single prediction string and the tuple of acceptable gold
answers, and returns a float in [0.0, 1.0]. A prediction scores against its
best-matching gold (the standard for multi-reference QA).
"""
from __future__ import annotations

from collections import Counter
from collections.abc import Sequence

from .normalize import normalize_answer, tokenize


def exact_match(prediction: str, golds: Sequence[str]) -> float:
    """1.0 if the normalized prediction equals any normalized gold, else 0.0."""
    normalized_pred = normalize_answer(prediction)
    return 1.0 if any(normalized_pred == normalize_answer(g) for g in golds) else 0.0


def _pairwise_f1(prediction: str, gold: str) -> float:
    pred_tokens = tokenize(prediction)
    gold_tokens = tokenize(gold)
    if not pred_tokens or not gold_tokens:
        # If both are empty they match; if exactly one is empty they do not.
        return 1.0 if pred_tokens == gold_tokens else 0.0
    shared = Counter(pred_tokens) & Counter(gold_tokens)
    num_shared = sum(shared.values())
    if num_shared == 0:
        return 0.0
    precision = num_shared / len(pred_tokens)
    recall = num_shared / len(gold_tokens)
    return 2 * precision * recall / (precision + recall)


def token_f1(prediction: str, golds: Sequence[str]) -> float:
    """Best token-overlap F1 across all gold answers."""
    return max((_pairwise_f1(prediction, g) for g in golds), default=0.0)


def contains_gold(prediction: str, golds: Sequence[str]) -> float:
    """1.0 if the normalized prediction contains a (non-empty) normalized gold."""
    normalized_pred = normalize_answer(prediction)
    for gold in golds:
        normalized_gold = normalize_answer(gold)
        if normalized_gold and normalized_gold in normalized_pred:
            return 1.0
    return 0.0


SCORERS = {
    "exact_match": exact_match,
    "token_f1": token_f1,
    "contains_gold": contains_gold,
}


def score_prediction(prediction: str, golds: Sequence[str]) -> dict[str, float]:
    """Run every rubric function and return a name -> score mapping."""
    return {name: fn(prediction, golds) for name, fn in SCORERS.items()}
