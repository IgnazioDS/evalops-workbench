"""Run the public benchmark and publish the committed artifact.

This is the workload behind EvalOps' Tier-A telemetry: a real, reproducible
evaluation that runs nightly (and on demand), persists its result to the repo,
and is read back by the public /api/benchmark-latest and /api/stats endpoints.

It is dependency-free and credential-free. Re-running it on the committed
fixture reproduces the published numbers exactly.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from .eval import artifact as artifact_mod
from .eval import baseline as baseline_mod
from .eval import ledger as ledger_mod
from .eval import report as report_mod
from .eval.cases import load_cases
from .eval.runner import compare, run_target
from .eval.targets import get_target

FIXTURE_ID = "benchmark-v1"
FIXTURE_REL = "examples/benchmark-v1/cases.jsonl"
BASELINE_VARIANT = "overlap_sentence"
CANDIDATE_VARIANT = "span_extract"
VARIANT_ORDER = ("first_sentence", "overlap_sentence", "span_extract")
GATE_METRIC = "token_f1"


def _repo_root() -> Path:
    # src/evalops_workbench/benchmark_runner.py -> repo root is three levels up.
    return Path(__file__).resolve().parents[2]


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def run_benchmark(repo_root: Path | None = None, *, write: bool = True) -> dict:
    """Execute the benchmark and return the artifact. Persist it when ``write``."""
    root = repo_root or _repo_root()
    fixture_path = root / FIXTURE_REL
    results_dir = root / "examples" / FIXTURE_ID / "results"
    archive_dir = results_dir / "archive"
    pinned_path = root / "examples" / FIXTURE_ID / "pinned-baseline.json"
    latest_artifact_path = root / "api" / "_benchmark_latest.json"
    history_path = root / "api" / "_benchmark_history.json"
    report_path = results_dir / "latest-report.md"

    cases = load_cases(fixture_path)
    results = {name: run_target(name, get_target(name), cases) for name in VARIANT_ORDER}
    baseline_result = results[BASELINE_VARIANT]
    candidate_result = results[CANDIDATE_VARIANT]

    regressions = compare(baseline_result, candidate_result, metric=GATE_METRIC)
    pinned = baseline_mod.load_pinned(pinned_path)
    verdict = baseline_mod.evaluate_gate(candidate_result, pinned, metric=GATE_METRIC)

    previous = ledger_mod.previous_record(history_path)
    generated_at = _now_iso()
    artifact = artifact_mod.build_artifact(
        fixture_id=FIXTURE_ID,
        fixture_rel=FIXTURE_REL,
        results=results,
        baseline_name=BASELINE_VARIANT,
        candidate_name=CANDIDATE_VARIANT,
        regressions=regressions,
        verdict=verdict,
        previous=previous,
        generated_at=generated_at,
    )

    if write:
        archive_dir.mkdir(parents=True, exist_ok=True)
        latest_artifact_path.parent.mkdir(parents=True, exist_ok=True)
        _write_json(latest_artifact_path, artifact)
        _write_json(archive_dir / f"{artifact['run_id']}.json", artifact)
        report_path.write_text(report_mod.render(artifact), encoding="utf-8")
        ledger_mod.append_record(history_path, artifact_mod.slim_record(artifact))
        if pinned is None:
            baseline_mod.save_pinned(pinned_path, candidate_result, metric=GATE_METRIC)

    return artifact


def _write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    artifact = run_benchmark()
    metrics = artifact["metrics"]
    print(
        f"[{artifact['run_id']}] cases={metrics['n_cases']} "
        f"candidate={metrics['candidate_variant']} "
        f"exact_match={metrics['exact_match']:.3f} token_f1={metrics['token_f1']:.3f} "
        f"(vs baseline {metrics['improvement_token_f1']:+.3f} F1) "
        f"regressions={metrics['regressions']} gate={metrics['gate_verdict']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
