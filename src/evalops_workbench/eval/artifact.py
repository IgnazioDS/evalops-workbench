"""Assemble the schema-conformed /api/benchmark-latest payload + slim history record.

The artifact is the public contract. Its shape matches the benchmark-latest
specification in TELEMETRY_SCHEMA.md: a stable envelope with metrics, the
per-variant comparison, the surfaced regressions, public artifact URLs, and a
run-over-run delta.
"""
from __future__ import annotations

import hashlib

from .baseline import GateVerdict
from .runner import Regression, RunResult

SYSTEM_SLUG = "evalops"
BENCHMARK_TYPE = "eval"
SCHEMA_VERSION = 1
_RAW_BASE = "https://raw.githubusercontent.com/IgnazioDS/evalops-workbench/main"


def run_id_for(fixture_id: str, candidate: RunResult, baseline: RunResult, generated_at: str) -> str:
    """Deterministic, reproducible id: date + short hash of the compared aggregates."""
    digest_source = f"{fixture_id}|{candidate.aggregate}|{baseline.aggregate}"
    short = hashlib.sha256(digest_source.encode("utf-8")).hexdigest()[:8]
    return f"{SYSTEM_SLUG}-{generated_at[:10]}-{short}"


def _artifact_urls(run_id: str, fixture_rel: str) -> dict:
    return {
        "report": f"{_RAW_BASE}/examples/benchmark-v1/results/latest-report.md",
        "fixture": f"{_RAW_BASE}/{fixture_rel}",
        "run": f"{_RAW_BASE}/examples/benchmark-v1/results/archive/{run_id}.json",
    }


def _variant_row(result: RunResult) -> dict:
    return {"name": result.target, **result.aggregate}


def _previous_block(previous: dict | None, metrics: dict) -> dict | None:
    if not previous:
        return None
    return {
        "run_id": previous.get("run_id"),
        "generated_at": previous.get("generated_at"),
        "delta": {
            "token_f1": round(metrics["token_f1"] - float(previous.get("token_f1", 0.0)), 6),
            "exact_match": round(metrics["exact_match"] - float(previous.get("exact_match", 0.0)), 6),
            "regressions": metrics["regressions"] - int(previous.get("regressions", 0)),
        },
    }


def build_artifact(
    *,
    fixture_id: str,
    fixture_rel: str,
    results: dict[str, RunResult],
    baseline_name: str,
    candidate_name: str,
    regressions: list[Regression],
    verdict: GateVerdict,
    previous: dict | None,
    generated_at: str,
) -> dict:
    baseline = results[baseline_name]
    candidate = results[candidate_name]
    run_id = run_id_for(fixture_id, candidate, baseline, generated_at)

    metrics = {
        "n_cases": candidate.n_cases,
        "baseline_variant": baseline_name,
        "candidate_variant": candidate_name,
        "exact_match": candidate.aggregate["exact_match"],
        "token_f1": candidate.aggregate["token_f1"],
        "contains_gold": candidate.aggregate["contains_gold"],
        "improvement_exact_match": round(
            candidate.aggregate["exact_match"] - baseline.aggregate["exact_match"], 6
        ),
        "improvement_token_f1": round(
            candidate.aggregate["token_f1"] - baseline.aggregate["token_f1"], 6
        ),
        "regressions": len(regressions),
        "pass_rate": candidate.aggregate["exact_match"],
        "gate_verdict": "pass" if verdict.passed else "fail",
    }

    return {
        "system": SYSTEM_SLUG,
        "benchmark_type": BENCHMARK_TYPE,
        "run_id": run_id,
        "fixture": fixture_id,
        "metrics": metrics,
        "variants": [_variant_row(results[name]) for name in results],
        "regressions": [
            {
                "case_id": r.case_id,
                "metric": r.metric,
                "baseline": r.baseline,
                "candidate": r.candidate,
                "delta": r.delta,
                "reason": r.reason,
                "tags": list(r.tags),
            }
            for r in regressions
        ],
        "gate": {
            "passed": verdict.passed,
            "metric": verdict.metric,
            "pinned": verdict.pinned,
            "observed": verdict.observed,
            "reasons": list(verdict.reasons),
        },
        "artifact_urls": _artifact_urls(run_id, fixture_rel),
        "schema_version": SCHEMA_VERSION,
        "generated_at": generated_at,
        "previous_run": _previous_block(previous, metrics),
    }


def slim_record(artifact: dict) -> dict:
    """The compact history row consumed by the ledger and /api/stats rollups."""
    metrics = artifact["metrics"]
    return {
        "run_id": artifact["run_id"],
        "generated_at": artifact["generated_at"],
        "pass_rate": metrics["pass_rate"],
        "token_f1": metrics["token_f1"],
        "exact_match": metrics["exact_match"],
        "regressions": metrics["regressions"],
        "regressed_ids": [reg["case_id"] for reg in artifact["regressions"]],
        "gate_verdict": metrics["gate_verdict"],
        "variants": [variant["name"] for variant in artifact["variants"]],
    }
