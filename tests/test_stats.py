"""Unit tests for the /api/stats Vercel serverless function (Tier A, live).

Covers:
- live path: benchmark history present, metrics derived from records
- degraded path: no history yet, contract satisfied with zeroed metrics
- schema shape matches the evalops Tier-A contract in TELEMETRY_SCHEMA.md
- safety caps and the never-5xx handler guarantee
"""
from __future__ import annotations

import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock

# Add repo root /api to sys.path so we can import the api/stats.py module.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "api"))
import stats  # type: ignore  # noqa: E402

_TIER_A_METRICS = {
    "eval_runs_total",
    "eval_runs_24h",
    "last_pass_rate",
    "rolling_pass_rate_7d",
    "regressions_caught_30d",
    "experiments_tracked",
}


def _write_history(records: list[dict]) -> Path:
    path = Path(tempfile.mkdtemp()) / "_benchmark_history.json"
    path.write_text(json.dumps(records), encoding="utf-8")
    return path


class LiveResponseTests(unittest.TestCase):
    def setUp(self) -> None:
        self._orig_history = stats.HISTORY_FILE
        self._orig_artifact = stats.ARTIFACT_FILE

    def tearDown(self) -> None:
        stats.HISTORY_FILE = self._orig_history
        stats.ARTIFACT_FILE = self._orig_artifact

    def test_live_operational_from_history(self) -> None:
        stats.HISTORY_FILE = _write_history(
            [
                {"run_id": "r1", "generated_at": stats._now_iso(), "pass_rate": 0.6,
                 "regressions": 2, "regressed_ids": ["a", "b"],
                 "variants": ["overlap_sentence", "span_extract"]},
                {"run_id": "r2", "generated_at": stats._now_iso(), "pass_rate": 0.7,
                 "regressions": 2, "regressed_ids": ["b", "c"],
                 "variants": ["span_extract", "first_sentence"]},
            ]
        )
        stats.ARTIFACT_FILE = Path("/nonexistent/_benchmark_latest.json")
        response = stats._build_response()

        self.assertEqual(response["mode"], "live")
        self.assertEqual(response["workload"], "benchmark")
        self.assertEqual(response["status"], "operational")
        self.assertEqual(response["schema_version"], 1)
        self.assertEqual(set(response["metrics"]), _TIER_A_METRICS)
        self.assertEqual(response["metrics"]["eval_runs_total"], 2)
        self.assertEqual(response["metrics"]["last_pass_rate"], 0.7)
        # Distinct regressions across the window: union of {a,b} and {b,c} = 3.
        self.assertEqual(response["metrics"]["regressions_caught_30d"], 3)
        self.assertEqual(response["metrics"]["experiments_tracked"], 3)
        self.assertTrue(response["generated_at"].endswith("Z"))

    def test_degraded_without_history(self) -> None:
        stats.HISTORY_FILE = Path("/nonexistent/_benchmark_history.json")
        stats.ARTIFACT_FILE = Path("/nonexistent/_benchmark_latest.json")
        response = stats._build_response()

        self.assertEqual(response["mode"], "live")
        self.assertEqual(response["status"], "degraded")
        self.assertEqual(response["metrics"], stats._zeroed_metrics())
        self.assertIsNone(response["last_active_at"])


class SafetyCapTests(unittest.TestCase):
    def test_caps_clamp(self) -> None:
        self.assertEqual(stats._cap("eval_runs_total", 9_999_999), 1_000_000)
        self.assertEqual(stats._cap("experiments_tracked", 999_999), 100_000)
        self.assertEqual(stats._cap("not_a_field", 42), 42)


class HandlerTests(unittest.TestCase):
    def _invoke(self, method: str = "GET") -> tuple[int, dict[str, str], bytes]:
        rfile = io.BytesIO(f"{method} /api/stats HTTP/1.0\r\nHost: x\r\n\r\n".encode())
        wfile = io.BytesIO()
        h = stats.handler.__new__(stats.handler)
        h.rfile = rfile
        h.wfile = wfile
        h.client_address = ("127.0.0.1", 0)
        h.server = MagicMock()
        h.command = method
        h.path = "/api/stats"
        h.request_version = "HTTP/1.0"
        h.headers = {}
        h.requestline = f"{method} /api/stats HTTP/1.0"
        if method == "OPTIONS":
            h.do_OPTIONS()
        else:
            h.do_GET()
        raw = wfile.getvalue().decode("utf-8", errors="replace")
        head, _, body = raw.partition("\r\n\r\n")
        status_code = int(head.split("\r\n", 1)[0].split(" ", 2)[1])
        headers = {}
        for line in head.split("\r\n")[1:]:
            if ": " in line:
                key, value = line.split(": ", 1)
                headers[key] = value
        return status_code, headers, body.encode("utf-8")

    def test_get_returns_200_with_valid_contract(self) -> None:
        status, headers, body = self._invoke("GET")
        self.assertEqual(status, 200)
        self.assertEqual(headers.get("Content-Type"), "application/json")
        self.assertEqual(headers.get("Access-Control-Allow-Origin"), "*")
        self.assertIn("max-age=30", headers.get("Cache-Control", ""))
        payload = json.loads(body)
        self.assertEqual(payload["schema_version"], 1)
        self.assertEqual(payload["mode"], "live")

    def test_options_returns_204(self) -> None:
        status, headers, _ = self._invoke("OPTIONS")
        self.assertEqual(status, 204)
        self.assertEqual(headers.get("Access-Control-Allow-Methods"), "GET, OPTIONS")


if __name__ == "__main__":
    unittest.main()
