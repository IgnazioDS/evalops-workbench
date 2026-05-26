"""Run the public benchmark on top of the workbench engine and publish it.

This is the public-proof layer over ``workbench.py``: it runs the canonical
eval engine over the committed support-QA dataset, comparing the baseline
prompt variant against the candidate, gates regressions, and writes a
schema-conformed artifact the stdlib /api/benchmark-latest and /api/stats
endpoints serve. Re-running on the committed fixture reproduces the numbers.

The workbench engine (DuckDB-backed) runs here in CI; the deployed endpoints
only ever read the committed JSON artifact.
"""
from __future__ import annotations

import hashlib
import json
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from .workbench import (
    assess_gate,
    compare_runs,
    format_comparison_markdown,
    run_evaluation,
)

SYSTEM_SLUG = "evalops"
BENCHMARK_TYPE = "eval"
SCHEMA_VERSION = 1
FIXTURE_ID = "support-qa"
DATASET_REL = "examples/support_qa.json"
BASELINE_VARIANT = "prompt_v1"
CANDIDATE_VARIANT = "prompt_v2"

# Gate thresholds: any regression, any aggregate drop, blocks. The candidate
# must not lose ground on the pinned dataset.
GATE_KWARGS = {"max_regressions": 0, "max_score_drop": 0.0, "max_pass_rate_drop": 0.0}

_RAW_BASE = "https://raw.githubusercontent.com/IgnazioDS/evalops-workbench/main"
_HISTORY_KEEP = 100


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _read_history(path: Path) -> list[dict]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, OSError, ValueError):
        return []
    return data if isinstance(data, list) else []


def _run_id(generated_at: str, base, candidate) -> str:
    seed = f"{candidate.pass_rate}|{candidate.avg_score}|{base.pass_rate}|{base.avg_score}|{candidate.total_cases}"
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()[:8]
    return f"{SYSTEM_SLUG}-{generated_at[:10]}-{digest}"


def _variant_row(summary) -> dict:
    return {
        "name": summary.variant,
        "pass_rate": round(summary.pass_rate, 4),
        "avg_score": round(summary.avg_score, 4),
        "passed_cases": summary.passed_cases,
        "total_cases": summary.total_cases,
    }


def _regression_rows(comparison) -> list[dict]:
    return [
        {
            "case_id": item.get("case_id"),
            "score_delta": item.get("score_delta"),
            "reason": item.get("summary", ""),
        }
        for item in comparison.regressions
    ]


def _previous_block(previous: dict | None, metrics: dict) -> dict | None:
    if not previous:
        return None
    return {
        "run_id": previous.get("run_id"),
        "generated_at": previous.get("generated_at"),
        "delta": {
            "pass_rate": round(metrics["candidate_pass_rate"] - float(previous.get("pass_rate", 0.0)), 4),
            "avg_score": round(metrics["candidate_avg_score"] - float(previous.get("avg_score", 0.0)), 4),
            "regressions": metrics["regressions"] - int(previous.get("regressions", 0)),
        },
    }


def _build_artifact(*, base, candidate, comparison, gate, generated_at, previous) -> dict:
    run_id = _run_id(generated_at, base, candidate)
    metrics = {
        "n_cases": candidate.total_cases,
        "baseline_variant": base.variant,
        "candidate_variant": candidate.variant,
        "baseline_pass_rate": round(base.pass_rate, 4),
        "candidate_pass_rate": round(candidate.pass_rate, 4),
        "baseline_avg_score": round(base.avg_score, 4),
        "candidate_avg_score": round(candidate.avg_score, 4),
        "pass_rate_delta": round(comparison.pass_rate_delta, 4),
        "avg_score_delta": round(comparison.avg_score_delta, 4),
        "regressions": len(comparison.regressions),
        "improvements": len(comparison.improvements),
        "gate_verdict": "pass" if gate.passed else "fail",
    }
    return {
        "system": SYSTEM_SLUG,
        "benchmark_type": BENCHMARK_TYPE,
        "run_id": run_id,
        "fixture": FIXTURE_ID,
        "metrics": metrics,
        "variants": [_variant_row(base), _variant_row(candidate)],
        "regressions": _regression_rows(comparison),
        "gate": {
            "passed": gate.passed,
            "reasons": gate.reasons,
            "max_regressions": gate.max_regressions,
            "max_score_drop": gate.max_score_drop,
            "max_pass_rate_drop": gate.max_pass_rate_drop,
        },
        "artifact_urls": {
            "report": f"{_RAW_BASE}/examples/benchmark/latest-report.md",
            "fixture": f"{_RAW_BASE}/{DATASET_REL}",
            "run": f"{_RAW_BASE}/examples/benchmark/archive/{run_id}.json",
        },
        "schema_version": SCHEMA_VERSION,
        "generated_at": generated_at,
        "previous_run": _previous_block(previous, metrics),
    }


def _slim_record(artifact: dict) -> dict:
    metrics = artifact["metrics"]
    return {
        "run_id": artifact["run_id"],
        "generated_at": artifact["generated_at"],
        "pass_rate": metrics["candidate_pass_rate"],
        "avg_score": metrics["candidate_avg_score"],
        "regressions": metrics["regressions"],
        "regressed_ids": [r["case_id"] for r in artifact["regressions"]],
        "gate_verdict": metrics["gate_verdict"],
        "variants": [v["name"] for v in artifact["variants"]],
    }


def _write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def run_benchmark(repo_root: Path | None = None, *, write: bool = True) -> dict:
    """Run baseline vs candidate through the workbench engine and publish."""
    root = repo_root or _repo_root()
    dataset = root / DATASET_REL
    results_dir = root / "examples" / "benchmark"
    history_path = root / "api" / "_benchmark_history.json"
    latest_path = root / "api" / "_benchmark_latest.json"

    workspace = Path(tempfile.mkdtemp(prefix="evalops-bench-"))
    try:
        base = run_evaluation(dataset, BASELINE_VARIANT, workspace, root)
        candidate = run_evaluation(dataset, CANDIDATE_VARIANT, workspace, root)
        comparison = compare_runs(base.run_id, candidate.run_id, workspace)
        gate = assess_gate(comparison, **GATE_KWARGS)
        report_md = format_comparison_markdown(comparison, limit=20)
    finally:
        shutil.rmtree(workspace, ignore_errors=True)

    generated_at = _now_iso()
    previous = (_read_history(history_path) or [None])[-1]
    artifact = _build_artifact(
        base=base,
        candidate=candidate,
        comparison=comparison,
        gate=gate,
        generated_at=generated_at,
        previous=previous,
    )

    if write:
        _write_json(latest_path, artifact)
        _write_json(results_dir / "archive" / f"{artifact['run_id']}.json", artifact)
        report_path = results_dir / "latest-report.md"
        report_path.parent.mkdir(parents=True, exist_ok=True)
        header = (
            f"# EvalOps benchmark: {FIXTURE_ID}\n\n"
            f"- Run: `{artifact['run_id']}`\n"
            f"- Generated: {generated_at}\n"
            f"- Gate verdict: **{artifact['metrics']['gate_verdict'].upper()}**\n\n"
        )
        report_path.write_text(header + report_md + "\n", encoding="utf-8")

        history = _read_history(history_path)
        history.append(_slim_record(artifact))
        _write_json(history_path, history[-_HISTORY_KEEP:])

    return artifact


def main(argv: list[str] | None = None) -> int:
    artifact = run_benchmark()
    metrics = artifact["metrics"]
    print(
        f"[{artifact['run_id']}] cases={metrics['n_cases']} "
        f"candidate={metrics['candidate_variant']} pass_rate={metrics['candidate_pass_rate']:.3f} "
        f"(vs baseline {metrics['pass_rate_delta']:+.3f}) "
        f"avg_score={metrics['candidate_avg_score']:.3f} "
        f"regressions={metrics['regressions']} improvements={metrics['improvements']} "
        f"gate={metrics['gate_verdict']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
