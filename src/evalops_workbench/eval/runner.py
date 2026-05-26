"""Run a target over the dataset, aggregate scores, and diff two runs.

``run_target`` produces an immutable ``RunResult`` (per-case scores + aggregate
means). ``compare`` diffs a candidate against a baseline run and returns the
per-case regressions — the cases where the candidate scored strictly worse.
"""
from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

from .cases import Case
from .scorers import SCORERS, score_prediction
from .targets import Target

_REGRESSION_EPSILON = 1e-9


@dataclass(frozen=True)
class CaseScore:
    case_id: str
    prediction: str
    scores: dict[str, float]
    tags: tuple[str, ...]


@dataclass(frozen=True)
class RunResult:
    target: str
    n_cases: int
    aggregate: dict[str, float]
    case_scores: tuple[CaseScore, ...]


def run_target(name: str, target: Target, cases: Sequence[Case]) -> RunResult:
    """Score ``target`` against every case and roll up mean aggregates."""
    totals = {metric: 0.0 for metric in SCORERS}
    case_scores: list[CaseScore] = []
    for case in cases:
        prediction = target(case)
        scores = score_prediction(prediction, case.answers)
        for metric, value in scores.items():
            totals[metric] += value
        case_scores.append(CaseScore(case.id, prediction, scores, case.tags))

    denominator = len(cases) or 1
    aggregate = {metric: round(total / denominator, 6) for metric, total in totals.items()}
    return RunResult(name, len(cases), aggregate, tuple(case_scores))


@dataclass(frozen=True)
class Regression:
    case_id: str
    metric: str
    baseline: float
    candidate: float
    delta: float
    tags: tuple[str, ...]

    @property
    def reason(self) -> str:
        return (
            f"{self.metric}: candidate {self.candidate:.2f} below baseline "
            f"{self.baseline:.2f} ({self.delta:+.2f})"
        )


def compare(
    baseline: RunResult,
    candidate: RunResult,
    *,
    metric: str = "token_f1",
    threshold: float = _REGRESSION_EPSILON,
) -> list[Regression]:
    """Per-case regressions: candidate strictly worse than baseline on ``metric``."""
    baseline_by_id = {cs.case_id: cs for cs in baseline.case_scores}
    regressions: list[Regression] = []
    for candidate_score in candidate.case_scores:
        baseline_score = baseline_by_id.get(candidate_score.case_id)
        if baseline_score is None:
            continue
        before = baseline_score.scores.get(metric, 0.0)
        after = candidate_score.scores.get(metric, 0.0)
        if after < before - threshold:
            regressions.append(
                Regression(
                    case_id=candidate_score.case_id,
                    metric=metric,
                    baseline=round(before, 6),
                    candidate=round(after, 6),
                    delta=round(after - before, 6),
                    tags=candidate_score.tags,
                )
            )
    return regressions
