"""Pinned baseline contract and the regression gate.

EvalOps' thesis: a regression dashboard nobody reads does not prevent
regressions. The contract is that quality below a pinned baseline blocks. This
module persists that pinned aggregate (a versioned file in the repo) and
evaluates a candidate run against it.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from .runner import RunResult

_DEFAULT_METRIC = "token_f1"
_DEFAULT_TOLERANCE = 0.02


@dataclass(frozen=True)
class GateVerdict:
    passed: bool
    metric: str
    pinned: float | None
    observed: float
    reasons: tuple[str, ...]


def load_pinned(path: str | Path) -> dict | None:
    path = Path(path)
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError, ValueError):
        return None
    return data if isinstance(data, dict) else None


def save_pinned(path: str | Path, result: RunResult, *, metric: str = _DEFAULT_METRIC) -> None:
    payload = {"variant": result.target, "metric": metric, "aggregate": result.aggregate}
    Path(path).write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def evaluate_gate(
    candidate: RunResult,
    pinned: dict | None,
    *,
    metric: str = _DEFAULT_METRIC,
    tolerance: float = _DEFAULT_TOLERANCE,
) -> GateVerdict:
    """Pass unless the candidate aggregate drops below the pinned floor."""
    observed = float(candidate.aggregate.get(metric, 0.0))
    if pinned is None:
        return GateVerdict(
            passed=True,
            metric=metric,
            pinned=None,
            observed=observed,
            reasons=("no pinned baseline yet; this run establishes the contract",),
        )
    pinned_value = float(pinned.get("aggregate", {}).get(metric, 0.0))
    floor = pinned_value - tolerance
    if observed + 1e-9 >= floor:
        return GateVerdict(
            passed=True,
            metric=metric,
            pinned=pinned_value,
            observed=observed,
            reasons=(f"{metric} {observed:.3f} holds at or above pinned floor {floor:.3f}",),
        )
    return GateVerdict(
        passed=False,
        metric=metric,
        pinned=pinned_value,
        observed=observed,
        reasons=(
            f"{metric} {observed:.3f} dropped below pinned floor {floor:.3f} "
            f"(pinned {pinned_value:.3f}, tolerance {tolerance:.3f})",
        ),
    )
