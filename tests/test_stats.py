"""Unit tests for the /api/stats Vercel serverless function.

Covers:
- happy path: GitHub reachable, response shape matches Tier B contract
- degraded path: GitHub unreachable, contract still satisfied with status="degraded"
- safety caps: oversize values are clamped
- never returns 5xx (handler always emits HTTP 200)
"""
from __future__ import annotations

import io
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch
from urllib.error import URLError

# Add repo root to sys.path so we can import the api/stats.py module.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "api"))
import stats  # type: ignore  # noqa: E402


def _reset_cache() -> None:
    stats._cache = {"ts": 0.0, "payload": None}


def _fake_response(body: object, link_header: str = "") -> MagicMock:
    """Build a context-manager-compatible mock that mimics urlopen's return."""
    raw = json.dumps(body).encode("utf-8")
    cm = MagicMock()
    cm.__enter__ = MagicMock(return_value=cm)
    cm.__exit__ = MagicMock(return_value=False)
    cm.read = MagicMock(return_value=raw)
    cm.getheaders = MagicMock(
        return_value=[("Link", link_header)] if link_header else []
    )
    return cm


class ResponseShapeTests(unittest.TestCase):
    def setUp(self) -> None:
        _reset_cache()

    def test_happy_path_matches_contract(self) -> None:
        repo_payload = {"stargazers_count": 7, "language": "Python"}
        commit_payload = [
            {"commit": {"author": {"date": "2026-04-26T12:00:00Z"}}}
        ]

        def side_effect(req, timeout=None):
            url = req.full_url
            if "/commits" not in url:
                return _fake_response(repo_payload)
            return _fake_response(
                commit_payload,
                link_header=(
                    f"<https://api.github.com/repositories/x/commits"
                    f"?per_page=1&page=2>; rel=\"next\", "
                    f"<https://api.github.com/repositories/x/commits"
                    f"?per_page=1&page=42>; rel=\"last\""
                ),
            )

        with patch.object(stats, "urlopen", side_effect=side_effect):
            response = stats._build_response()

        self.assertEqual(response["schema_version"], 1)
        self.assertEqual(response["mode"], "showcase")
        self.assertEqual(response["status"], "operational")
        self.assertEqual(response["system"], stats.SYSTEM_SLUG)
        self.assertIn("metrics", response)
        self.assertEqual(response["metrics"]["repo_stars"], 7)
        self.assertEqual(response["metrics"]["primary_language"], "Python")
        self.assertEqual(response["metrics"]["commits_total"], 42)
        self.assertEqual(response["last_commit_at"], "2026-04-26T12:00:00Z")
        # generated_at is ISO-8601 with Z suffix.
        self.assertTrue(response["generated_at"].endswith("Z"))

    def test_degraded_when_github_unreachable(self) -> None:
        with patch.object(stats, "urlopen", side_effect=URLError("offline")):
            response = stats._build_response()

        self.assertEqual(response["schema_version"], 1)
        self.assertEqual(response["mode"], "showcase")
        self.assertEqual(response["status"], "degraded")
        self.assertEqual(response["metrics"]["commits_total"], 0)
        self.assertEqual(response["metrics"]["repo_stars"], 0)
        self.assertIsNone(response["last_commit_at"])

    def test_serves_stale_cache_on_subsequent_failure(self) -> None:
        # First call: successful. Second call: GitHub is down. Expect status
        # to flip to "degraded" but the metric values from the cache are kept.
        repo_payload = {"stargazers_count": 11, "language": "Go"}
        commit_payload = [
            {"commit": {"author": {"date": "2026-04-25T08:00:00Z"}}}
        ]

        def good(req, timeout=None):
            if "/commits" not in req.full_url:
                return _fake_response(repo_payload)
            return _fake_response(
                commit_payload,
                link_header=(
                    '<https://api.github.com/repositories/x/commits'
                    '?per_page=1&page=2>; rel="next", '
                    '<https://api.github.com/repositories/x/commits'
                    '?per_page=1&page=99>; rel="last"'
                ),
            )

        with patch.object(stats, "urlopen", side_effect=good):
            first = stats._build_response()
        self.assertEqual(first["status"], "operational")

        with patch.object(stats, "_fetch_metrics", side_effect=URLError("offline")):
            # Force cache miss by advancing the clock past the TTL.
            stats._cache["ts"] = 0.0
            stale = stats._build_response()
        self.assertEqual(stale["status"], "degraded")
        self.assertEqual(stale["metrics"]["repo_stars"], 11)
        self.assertEqual(stale["metrics"]["commits_total"], 99)


class SafetyCapTests(unittest.TestCase):
    def test_oversize_values_are_clamped(self) -> None:
        self.assertEqual(stats._cap("repo_stars", 99_999_999), 1_000_000)
        self.assertEqual(stats._cap("commits_total", 50_000_000), 1_000_000)
        self.assertEqual(stats._cap("commits_30d", 500_000), 100_000)
        self.assertEqual(stats._cap("lines_of_code", 999_999_999), 10_000_000)
        # Unknown key passes through unchanged.
        self.assertEqual(stats._cap("not_a_field", 42), 42)


class HandlerTests(unittest.TestCase):
    """Exercise the BaseHTTPRequestHandler entrypoint end-to-end."""

    def setUp(self) -> None:
        _reset_cache()

    def _invoke(self, method: str = "GET") -> tuple[int, dict[str, str], bytes]:
        # Build a minimal raw HTTP request the handler can parse.
        request_text = (
            f"{method} /api/stats HTTP/1.0\r\nHost: x\r\n\r\n"
        ).encode("utf-8")
        rfile = io.BytesIO(request_text)
        wfile = io.BytesIO()

        class _Conn:
            def makefile(self, *_args: object, **_kwargs: object) -> io.BytesIO:
                return rfile

        # BaseHTTPRequestHandler init runs the request automatically.
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
            with patch.object(stats, "urlopen", side_effect=URLError("test")):
                h.do_GET()

        raw = wfile.getvalue().decode("utf-8", errors="replace")
        head, _, body = raw.partition("\r\n\r\n")
        status_line = head.split("\r\n", 1)[0]
        status_code = int(status_line.split(" ", 2)[1])
        hdrs = {}
        for line in head.split("\r\n")[1:]:
            if ": " in line:
                k, v = line.split(": ", 1)
                hdrs[k] = v
        return status_code, hdrs, body.encode("utf-8")

    def test_get_returns_200_even_when_upstream_fails(self) -> None:
        status, hdrs, body = self._invoke("GET")
        self.assertEqual(status, 200)
        self.assertEqual(hdrs.get("Content-Type"), "application/json")
        self.assertEqual(hdrs.get("Access-Control-Allow-Origin"), "*")
        self.assertIn("max-age=30", hdrs.get("Cache-Control", ""))
        payload = json.loads(body)
        self.assertEqual(payload["schema_version"], 1)
        self.assertEqual(payload["status"], "degraded")

    def test_options_returns_204(self) -> None:
        status, hdrs, _ = self._invoke("OPTIONS")
        self.assertEqual(status, 204)
        self.assertEqual(hdrs.get("Access-Control-Allow-Origin"), "*")
        self.assertEqual(hdrs.get("Access-Control-Allow-Methods"), "GET, OPTIONS")


if __name__ == "__main__":
    unittest.main()
