"""Public telemetry endpoint for the showcase deploy.

Stdlib-only Vercel Python serverless function. Reports honest GitHub-derived
signals about the codebase, never simulated workload metrics. The Tier B
endpoint is consumed by the Production Telemetry panel on
https://eleventh.dev. See:

  https://github.com/IgnazioDS/IgnazioDS/blob/main/TELEMETRY_SCHEMA.md
"""
from __future__ import annotations

import json
import os
import re
import time
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

# --- repo identity ---
SYSTEM_SLUG = "evalops"
GITHUB_OWNER = "IgnazioDS"
GITHUB_REPO = "evalops-workbench"

# --- contract constants ---
SCHEMA_VERSION = 1
HTTP_TIMEOUT_S = 4.0
CACHE_TTL_S = 300  # 5 min, stays well under GitHub's 60-req/hr unauth cap

# --- safety caps: never expose values larger than these ---
SAFETY_CAPS: dict[str, int] = {
    "commits_total": 1_000_000,
    "commits_30d": 100_000,
    "lines_of_code": 10_000_000,
    "repo_stars": 1_000_000,
}

GITHUB_API = "https://api.github.com"
USER_AGENT = "eleventh-telemetry/1.0 (+https://eleventh.dev)"
STATIC_FILE = Path(__file__).parent / "_telemetry_static.json"

# Module-scope cache survives across warm Vercel invocations; cold starts pay
# one GitHub round-trip and prime the cache for ~5min of subsequent requests.
_cache: dict[str, Any] = {"ts": 0.0, "payload": None}


def _cap(name: str, value: int) -> int:
    cap = SAFETY_CAPS.get(name)
    return min(value, cap) if cap is not None else value


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _load_static() -> dict[str, Any]:
    """Read the build-time artifact (lines_of_code, built_at). Missing fields
    are silently treated as absent per the spec ("omit rather than estimate")."""
    try:
        return json.loads(STATIC_FILE.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, OSError, ValueError):
        return {}


def _http_get(url: str) -> tuple[Any, dict[str, str]]:
    """Stdlib HTTP GET. Returns (parsed_json, response_headers)."""
    req = Request(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "application/vnd.github+json"},
    )
    with urlopen(req, timeout=HTTP_TIMEOUT_S) as resp:  # noqa: S310 (https only)
        body = resp.read().decode("utf-8")
        # Headers is a Message object; convert to plain dict for portability.
        hdrs = {k.lower(): v for k, v in resp.getheaders()}
    return json.loads(body), hdrs


_LAST_PAGE_RE = re.compile(r'<[^>]*[?&]page=(\d+)[^>]*>;\s*rel="last"')


def _commits_count_from_link_header(link_header: str, when_no_last: int) -> int:
    """Parse the 'last' page number from GitHub's Link header.

    With per_page=1, the page count IS the total record count. When no Link
    header is present (single page of results), fall back to ``when_no_last``.
    """
    match = _LAST_PAGE_RE.search(link_header or "")
    if match:
        return int(match.group(1))
    return when_no_last


def _fetch_metrics() -> tuple[dict[str, Any], str | None]:
    """Pull GitHub-derived metrics. Returns (metrics, last_commit_at)."""
    repo, _ = _http_get(f"{GITHUB_API}/repos/{GITHUB_OWNER}/{GITHUB_REPO}")
    repo_stars = _cap("repo_stars", int(repo.get("stargazers_count") or 0))
    primary_language = repo.get("language") or "Unknown"

    commits_url = (
        f"{GITHUB_API}/repos/{GITHUB_OWNER}/{GITHUB_REPO}/commits?per_page=1"
    )
    latest_commits, latest_hdrs = _http_get(commits_url)
    commits_total = _cap(
        "commits_total",
        _commits_count_from_link_header(latest_hdrs.get("link", ""), len(latest_commits)),
    )
    last_commit_at: str | None = None
    if latest_commits:
        last_commit_at = (
            latest_commits[0].get("commit", {}).get("author", {}).get("date")
        )

    since = (datetime.now(timezone.utc) - timedelta(days=30)).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )
    recent_url = (
        f"{GITHUB_API}/repos/{GITHUB_OWNER}/{GITHUB_REPO}"
        f"/commits?per_page=1&since={since}"
    )
    recent_commits, recent_hdrs = _http_get(recent_url)
    commits_30d = _cap(
        "commits_30d",
        _commits_count_from_link_header(recent_hdrs.get("link", ""), len(recent_commits)),
    )

    metrics: dict[str, Any] = {
        "commits_30d": commits_30d,
        "commits_total": commits_total,
        "primary_language": primary_language,
        "repo_stars": repo_stars,
    }
    static = _load_static()
    loc = static.get("lines_of_code")
    if isinstance(loc, int) and loc > 0:
        metrics["lines_of_code"] = _cap("lines_of_code", loc)
    return metrics, last_commit_at


def _zeroed_metrics() -> dict[str, Any]:
    metrics: dict[str, Any] = {
        "commits_30d": 0,
        "commits_total": 0,
        "primary_language": "Unknown",
        "repo_stars": 0,
    }
    static = _load_static()
    loc = static.get("lines_of_code")
    if isinstance(loc, int) and loc > 0:
        metrics["lines_of_code"] = _cap("lines_of_code", loc)
    return metrics


def _build_response() -> dict[str, Any]:
    """Compose the full response object. Always returns a parseable dict."""
    now = time.time()
    cached = _cache.get("payload")
    if cached is not None and (now - _cache["ts"]) < CACHE_TTL_S:
        fresh = dict(cached)
        fresh["generated_at"] = _now_iso()
        return fresh

    static = _load_static()
    last_deployed_at = (
        os.environ.get("VERCEL_GIT_COMMIT_AUTHOR_DATE") or static.get("built_at")
    )

    try:
        metrics, last_commit_at = _fetch_metrics()
        status = "operational"
    except (HTTPError, URLError, OSError, json.JSONDecodeError, ValueError, TimeoutError):
        # Upstream unreachable. Serve last good cache if we have one,
        # otherwise zeros. Never propagate the error.
        if cached is not None:
            stale = dict(cached)
            stale["status"] = "degraded"
            stale["generated_at"] = _now_iso()
            return stale
        metrics = _zeroed_metrics()
        last_commit_at = None
        status = "degraded"

    response: dict[str, Any] = {
        "system": SYSTEM_SLUG,
        "mode": "showcase",
        "status": status,
        "last_deployed_at": last_deployed_at,
        "last_commit_at": last_commit_at,
        "metrics": metrics,
        "schema_version": SCHEMA_VERSION,
        "generated_at": _now_iso(),
    }

    if status == "operational":
        _cache["payload"] = response
        _cache["ts"] = now
    return response


class handler(BaseHTTPRequestHandler):
    """Vercel Python serverless entrypoint.

    Vercel discovers this class by name; the runtime invokes ``do_GET`` /
    ``do_OPTIONS`` per the BaseHTTPRequestHandler protocol.
    """

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
        except Exception:  # noqa: BLE001 (last-resort: contract forbids 5xx)
            payload = {
                "system": SYSTEM_SLUG,
                "mode": "showcase",
                "status": "degraded",
                "last_deployed_at": None,
                "last_commit_at": None,
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
        return  # Suppress default access log; Vercel captures stdout/stderr.
