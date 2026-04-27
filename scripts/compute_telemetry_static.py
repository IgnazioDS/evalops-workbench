"""Generate api/_telemetry_static.json for the public stats endpoint.

Counts source lines and captures build time. Stdlib-only so it has zero
install footprint. Run before each deploy:

    python3 scripts/compute_telemetry_static.py

Commit the resulting api/_telemetry_static.json. The runtime function
(api/stats.py) reads it to populate the `lines_of_code` field per the
Tier B telemetry contract.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "api" / "_telemetry_static.json"

SOURCE_EXTS = frozenset(
    {".py", ".html", ".css", ".js", ".ts", ".tsx", ".jsx", ".md", ".json"}
)
EXCLUDE_DIRS = frozenset(
    {
        ".git",
        ".vercel",
        ".venv",
        "venv",
        "node_modules",
        "__pycache__",
        ".pytest_cache",
        ".mypy_cache",
        "dist",
        "build",
        ".idea",
    }
)


def count_lines(root: Path) -> int:
    total = 0
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if any(part in EXCLUDE_DIRS for part in path.parts):
            continue
        if path.suffix not in SOURCE_EXTS:
            continue
        # Exclude the build artifact itself so each run is stable.
        if path.resolve() == OUT.resolve():
            continue
        try:
            with path.open("rb") as f:
                total += sum(1 for _ in f)
        except OSError:
            continue
    return total


def main() -> int:
    loc = count_lines(ROOT)
    payload = {
        "lines_of_code": loc,
        "built_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {payload}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
