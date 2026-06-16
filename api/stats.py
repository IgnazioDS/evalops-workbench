"""Public telemetry endpoint for EvalOps Workbench (Tier A, live workload).

Stdlib-only Vercel Python serverless function. The live workload is the public
benchmark: ``evalops_workbench.benchmark_runner`` runs nightly, persists each
result to the repo, and this endpoint reports honest metrics derived from that
durable history. See:

  https://github.com/IgnazioDS/IgnazioDS/blob/main/TELEMETRY_SCHEMA.md

Every value is computed from committed run records. Nothing is simulated,
seeded, or incremented in memory. If no run has been published the endpoint
degrades honestly (status="degraded", zeroed metrics) and never returns 5xx.
"""
from __future__ import annotations

import json
import os
import urllib.request
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from typing import Any

SYSTEM_SLUG = "evalops"
SCHEMA_VERSION = 1

ARTIFACT_FILE = Path(__file__).parent / "_benchmark_latest.json"
HISTORY_FILE = Path(__file__).parent / "_benchmark_history.json"
STATIC_FILE = Path(__file__).parent / "_telemetry_static.json"

# The scheduled benchmark publishes here because main is ruleset-protected.
_TELEMETRY_RAW_BASE = (
    "https://raw.githubusercontent.com/IgnazioDS/evalops-workbench/telemetry/api/"
)
_FETCH_TIMEOUT_S = 2.5

# Sanity caps: never expose values larger than these (defence against a runaway
# history file). The benchmark publishes one run per scheduled invocation.
SAFETY_CAPS: dict[str, int] = {
    "eval_runs_total": 1_000_000,
    "eval_runs_24h": 10_000,
    "regressions_caught_30d": 1_000_000,
    "experiments_tracked": 100_000,
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _cap(name: str, value: int) -> int:
    cap = SAFETY_CAPS.get(name)
    return min(value, cap) if cap is not None else value


def _read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, OSError, ValueError):
        return None


def _fetch_remote_json(filename: str) -> Any:
    """Best-effort fetch of the freshest artifact from the telemetry data branch.

    Returns None on any failure so the caller falls back to the committed copy.
    Only runs in the deployed Vercel runtime; tests/local use the committed copy.
    """
    if not os.environ.get("VERCEL"):
        return None
    try:
        req = urllib.request.Request(
            _TELEMETRY_RAW_BASE + filename,
            headers={"User-Agent": f"{SYSTEM_SLUG}-telemetry"},
        )
        with urllib.request.urlopen(req, timeout=_FETCH_TIMEOUT_S) as resp:
            if resp.status != 200:
                return None
            return json.loads(resp.read().decode("utf-8"))
    except Exception:  # noqa: BLE001 - the contract forbids 5xx; fall back instead
        return None


def _parse_iso(value: Any) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def _within(record: dict, days: int, now: datetime) -> bool:
    stamp = _parse_iso(record.get("generated_at"))
    return stamp is not None and (now - stamp) <= timedelta(days=days)


def _zeroed_metrics() -> dict[str, Any]:
    return {
        "eval_runs_total": 0,
        "eval_runs_24h": 0,
        "last_pass_rate": 0.0,
        "rolling_pass_rate_7d": 0.0,
        "regressions_caught_30d": 0,
        "experiments_tracked": 0,
    }


def _metrics_from_history(history: list[dict], now: datetime) -> dict[str, Any]:
    if not history:
        return _zeroed_metrics()

    runs_7d = [r for r in history if _within(r, 7, now)]
    pass_rates_7d = [float(r.get("pass_rate", 0.0)) for r in runs_7d]
    rolling_7d = (
        round(sum(pass_rates_7d) / len(pass_rates_7d), 4)
        if pass_rates_7d
        else float(history[-1].get("pass_rate", 0.0))
    )

    variants: set[str] = set()
    # Distinct regressions, not a per-run sum: re-detecting the same case nightly
    # is not catching a new regression, so the 30-day count unions case ids.
    regressed_30d: set[str] = set()
    for record in history:
        variants.update(record.get("variants", []) or [])
        if _within(record, 30, now):
            regressed_30d.update(record.get("regressed_ids", []) or [])

    return {
        "eval_runs_total": _cap("eval_runs_total", len(history)),
        "eval_runs_24h": _cap("eval_runs_24h", sum(1 for r in history if _within(r, 1, now))),
        "last_pass_rate": round(float(history[-1].get("pass_rate", 0.0)), 4),
        "rolling_pass_rate_7d": rolling_7d,
        "regressions_caught_30d": _cap("regressions_caught_30d", len(regressed_30d)),
        "experiments_tracked": _cap("experiments_tracked", len(variants)),
    }


def _build_response() -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    static = _read_json(STATIC_FILE) or {}
    last_deployed_at = os.environ.get("VERCEL_GIT_COMMIT_AUTHOR_DATE") or static.get("built_at")

    # Prefer the freshest artifact from the telemetry branch; fall back to the
    # copy committed on main so a network blip degrades gracefully.
    history = _fetch_remote_json("_benchmark_history.json")
    if not isinstance(history, list):
        history = _read_json(HISTORY_FILE)
    artifact = _fetch_remote_json("_benchmark_latest.json")
    if not isinstance(artifact, dict):
        artifact = _read_json(ARTIFACT_FILE)

    if isinstance(history, list) and history:
        metrics = _metrics_from_history(history, now)
        last_active_at = (
            artifact.get("generated_at") if isinstance(artifact, dict) else None
        ) or history[-1].get("generated_at")
        status = "operational"
    else:
        metrics = _zeroed_metrics()
        last_active_at = None
        status = "degraded"

    return {
        "system": SYSTEM_SLUG,
        "mode": "live",
        "workload": "benchmark",
        "status": status,
        "last_deployed_at": last_deployed_at,
        "last_active_at": last_active_at,
        "metrics": metrics,
        "schema_version": SCHEMA_VERSION,
        "generated_at": _now_iso(),
    }


class handler(BaseHTTPRequestHandler):
    """Vercel Python serverless entrypoint."""

    def _write_common_headers(self) -> None:
        self.send_header("Cache-Control", "public, max-age=30, stale-while-revalidate=60")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self) -> None:  # noqa: N802 (interface contract)
        self.send_response(204)
        self._write_common_headers()
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802 (interface contract)
        try:
            payload = _build_response()
        except Exception:  # noqa: BLE001 (last resort: contract forbids 5xx)
            payload = {
                "system": SYSTEM_SLUG,
                "mode": "live",
                "workload": "benchmark",
                "status": "degraded",
                "last_deployed_at": None,
                "last_active_at": None,
                "metrics": _zeroed_metrics(),
                "schema_version": SCHEMA_VERSION,
                "generated_at": _now_iso(),
            }
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self._write_common_headers()
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt: str, *args: Any) -> None:  # noqa: A002, ARG002
        return
