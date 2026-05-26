"""Public benchmark endpoint: the latest published evaluation run.

Stdlib-only Vercel Python serverless function. Serves the committed artifact at
``api/_benchmark_latest.json`` (written by ``evalops_workbench.benchmark_runner``
and refreshed by the nightly cron). The artifact already conforms to the
benchmark-latest specification in TELEMETRY_SCHEMA.md, so this endpoint reads and
returns it directly. The contract forbids HTTP 5xx; a missing artifact yields a
valid ``status: "pending"`` envelope.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from typing import Any

SYSTEM_SLUG = "evalops"
BENCHMARK_TYPE = "eval"
SCHEMA_VERSION = 1
ARTIFACT_FILE = Path(__file__).parent / "_benchmark_latest.json"


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _pending_payload() -> dict[str, Any]:
    """Honest envelope for the window before the first run is published."""
    return {
        "system": SYSTEM_SLUG,
        "benchmark_type": BENCHMARK_TYPE,
        "status": "pending",
        "run_id": None,
        "metrics": None,
        "schema_version": SCHEMA_VERSION,
        "generated_at": _now_iso(),
    }


def build_response() -> dict[str, Any]:
    try:
        return json.loads(ARTIFACT_FILE.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, OSError, ValueError):
        return _pending_payload()


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
            payload = build_response()
        except Exception:  # noqa: BLE001 (last resort: contract forbids 5xx)
            payload = _pending_payload()
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self._write_common_headers()
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt: str, *args: Any) -> None:  # noqa: A002, ARG002
        return
