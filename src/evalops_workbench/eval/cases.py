"""The evaluation dataset: an immutable ``Case`` and loaders for JSONL/JSON/CSV.

A case is one labelled example: a question over a context passage, with one or
more acceptable gold answers. Loading validates at the boundary and fails fast
on malformed rows rather than silently scoring against garbage.
"""
from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Case:
    """One labelled evaluation example."""

    id: str
    question: str
    context: str
    answers: tuple[str, ...]
    tags: tuple[str, ...] = ()


def _coerce_answers(raw: object) -> tuple[str, ...]:
    if isinstance(raw, str):
        return (raw,)
    if isinstance(raw, (list, tuple)):
        answers = tuple(str(a) for a in raw if str(a).strip())
        if answers:
            return answers
    raise ValueError("case 'answers' must be a non-empty string or list of strings")


def _coerce_tags(raw: object) -> tuple[str, ...]:
    if raw is None or raw == "":
        return ()
    if isinstance(raw, str):
        return tuple(t.strip() for t in raw.split("|") if t.strip())
    if isinstance(raw, (list, tuple)):
        return tuple(str(t).strip() for t in raw if str(t).strip())
    return ()


def _coerce_case(raw: dict) -> Case:
    for field in ("id", "question", "context", "answers"):
        if field not in raw:
            raise ValueError(f"case is missing required field '{field}': {raw!r}")
    return Case(
        id=str(raw["id"]),
        question=str(raw["question"]),
        context=str(raw["context"]),
        answers=_coerce_answers(raw["answers"]),
        tags=_coerce_tags(raw.get("tags")),
    )


def load_cases(path: str | Path) -> list[Case]:
    """Load cases from a ``.jsonl``, ``.json`` (array), or ``.csv`` file."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"fixture not found: {path}")

    suffix = path.suffix.lower()
    if suffix == ".jsonl":
        rows = [
            json.loads(line)
            for line in path.read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]
    elif suffix == ".json":
        rows = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(rows, list):
            raise ValueError(f"{path} must contain a JSON array of cases")
    elif suffix == ".csv":
        with path.open(encoding="utf-8", newline="") as handle:
            rows = list(csv.DictReader(handle))
    else:
        raise ValueError(f"unsupported fixture extension: {suffix}")

    cases = [_coerce_case(row) for row in rows]
    if not cases:
        raise ValueError(f"fixture {path} contained no cases")
    _assert_unique_ids(cases)
    return cases


def _assert_unique_ids(cases: list[Case]) -> None:
    seen: set[str] = set()
    for case in cases:
        if case.id in seen:
            raise ValueError(f"duplicate case id: {case.id}")
        seen.add(case.id)
