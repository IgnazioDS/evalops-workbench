"""Append-only run history, stored as a JSON array the stdlib endpoints can read.

Each record is a slim summary of one published run. The history backs the
run-over-run delta on /api/benchmark-latest and the trailing rollups
(24h / 7d / 30d) on /api/stats. Trimmed to a bounded length so the committed
artifact never grows without limit.
"""
from __future__ import annotations

import json
from pathlib import Path

_KEEP = 100


def read_records(path: str | Path) -> list[dict]:
    path = Path(path)
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError, ValueError):
        return []
    return data if isinstance(data, list) else []


def previous_record(path: str | Path) -> dict | None:
    """The most recent record currently on disk (before a new append)."""
    records = read_records(path)
    return records[-1] if records else None


def append_record(path: str | Path, record: dict, *, keep: int = _KEEP) -> list[dict]:
    """Append ``record`` and persist, trimming to the most recent ``keep`` runs."""
    records = read_records(path)
    records.append(record)
    trimmed = records[-keep:]
    Path(path).write_text(json.dumps(trimmed, indent=2) + "\n", encoding="utf-8")
    return trimmed
