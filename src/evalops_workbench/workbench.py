from __future__ import annotations

import csv
import json
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import duckdb


@dataclass(frozen=True)
class Rubric:
    required_keywords: list[str]
    forbidden_keywords: list[str]
    pass_threshold: float


@dataclass(frozen=True)
class EvalCase:
    case_id: str
    prompt: str
    expected: str
    reference_answer: str
    rubric: Rubric
    tags: list[str]


@dataclass(frozen=True)
class VariantSpec:
    name: str
    description: str
    mode: str
    system_prompt: str
    answer_overrides: dict[str, str]
    fallback_suffix: str


@dataclass(frozen=True)
class CaseResult:
    case_id: str
    prompt: str
    expected: str
    output: str
    score: float
    passed: bool
    matched_keywords: list[str]
    missing_keywords: list[str]
    forbidden_keywords_hit: list[str]
    notes: str


@dataclass(frozen=True)
class RunSummary:
    run_id: str
    variant: str
    dataset_path: str
    created_at: str
    total_cases: int
    passed_cases: int
    failed_cases: int
    avg_score: float
    pass_rate: float
    workspace: str
    results_path: str


@dataclass(frozen=True)
class RunComparison:
    base_run: str
    candidate_run: str
    base_avg_score: float
    candidate_avg_score: float
    avg_score_delta: float
    base_pass_rate: float
    candidate_pass_rate: float
    pass_rate_delta: float
    baseline_failed_cases: int
    candidate_failed_cases: int
    regressions: list[dict[str, Any]]
    improvements: list[dict[str, Any]]


@dataclass(frozen=True)
class RunDetails:
    summary: RunSummary
    results: list[CaseResult]


@dataclass(frozen=True)
class GateResult:
    comparison: RunComparison
    passed: bool
    reasons: list[str]
    max_regressions: int
    max_score_drop: float
    max_pass_rate_drop: float


def load_dataset(dataset_path: str | Path) -> list[EvalCase]:
    path = Path(dataset_path)
    if path.suffix.lower() == ".csv":
        payload = list(csv.DictReader(path.read_text(encoding="utf-8").splitlines()))
    else:
        payload = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(payload, list):
            raise ValueError("Dataset file must contain a top-level JSON array.")

    dataset: list[EvalCase] = []
    for index, item in enumerate(payload, start=1):
        if not isinstance(item, dict):
            raise ValueError(f"Dataset row {index} must be an object.")

        rubric_data = item.get("rubric", {})
        if not isinstance(rubric_data, dict):
            raise ValueError(f"Dataset row {index} rubric must be an object.")

        dataset.append(
            EvalCase(
                case_id=_as_str(item, "id", index),
                prompt=_as_str(item, "input", index),
                expected=_as_str(item, "expected", index),
                reference_answer=_as_str(item, "reference_answer", index),
                rubric=Rubric(
                    required_keywords=_as_list(
                        rubric_data.get("required_keywords", item.get("required_keywords", [])),
                        index,
                    ),
                    forbidden_keywords=_as_list(
                        rubric_data.get("forbidden_keywords", item.get("forbidden_keywords", [])),
                        index,
                    ),
                    pass_threshold=float(
                        rubric_data.get("pass_threshold", item.get("pass_threshold", 1.0))
                    ),
                ),
                tags=_as_list(item.get("tags", []), index),
            )
        )
    return dataset


def resolve_variant(variant: str | Path, repo_root: str | Path) -> VariantSpec:
    raw = Path(variant)
    candidate_paths = [raw]
    if not raw.suffix:
        candidate_paths.append(Path(repo_root) / "examples" / "variants" / f"{raw.name}.json")
    for path in candidate_paths:
        if path.exists():
            data = json.loads(path.read_text(encoding="utf-8"))
            return VariantSpec(
                name=str(data["name"]),
                description=str(data["description"]),
                mode=str(data.get("mode", "grounded")),
                system_prompt=str(data.get("system_prompt", "")),
                answer_overrides={
                    str(key): str(value) for key, value in dict(data.get("answer_overrides", {})).items()
                },
                fallback_suffix=str(data.get("fallback_suffix", "")),
            )
    raise ValueError(
        f"Could not resolve variant '{variant}'. Pass a file path or a name from examples/variants/."
    )


def run_evaluation(
    dataset_path: str | Path,
    variant: str | Path,
    workspace: str | Path,
    repo_root: str | Path,
) -> RunSummary:
    dataset = load_dataset(dataset_path)
    variant_spec = resolve_variant(variant, repo_root)
    workspace_path = Path(workspace)
    results_dir = workspace_path / "runs"
    results_dir.mkdir(parents=True, exist_ok=True)
    db_path = workspace_path / "evalops.duckdb"

    run_id = f"run_{datetime.now(tz=UTC).strftime('%Y%m%dT%H%M%S%f')}_{uuid.uuid4().hex[:6]}"
    created_at = datetime.now(tz=UTC).isoformat().replace("+00:00", "Z")
    results_path = results_dir / f"{run_id}.jsonl"

    results = [evaluate_case(case, variant_spec) for case in dataset]
    _write_results_jsonl(results_path, results)

    summary = build_run_summary(
        run_id=run_id,
        variant=variant_spec.name,
        dataset_path=str(Path(dataset_path)),
        created_at=created_at,
        results=results,
        workspace=workspace_path,
        results_path=results_path,
    )
    _ensure_schema(db_path)
    _store_run(db_path, summary, results)
    return summary


def compare_runs(base_run: str, candidate_run: str, workspace: str | Path) -> RunComparison:
    base_details = get_run_details(base_run, workspace)
    candidate_details = get_run_details(candidate_run, workspace)

    candidate_by_case = {item.case_id: item for item in candidate_details.results}
    regressions: list[dict[str, Any]] = []
    improvements: list[dict[str, Any]] = []

    for base in base_details.results:
        candidate = candidate_by_case.get(base.case_id)
        if candidate is None:
            regressions.append(
                {
                    "case_id": base.case_id,
                    "kind": "missing_case",
                    "base_score": base.score,
                    "candidate_score": None,
                    "score_delta": None,
                    "base_missing_keywords": base.missing_keywords,
                    "candidate_missing_keywords": [],
                    "summary": "Candidate run does not contain this evaluation case.",
                }
            )
            continue

        score_delta = round(candidate.score - base.score, 3)

        if base.passed and not candidate.passed:
            regressions.append(
                _delta_record(
                    case_id=base.case_id,
                    kind="pass_to_fail",
                    base=base,
                    candidate=candidate,
                    score_delta=score_delta,
                    summary=f"Case {base.case_id} regressed from pass to fail.",
                )
            )
        elif score_delta < 0:
            regressions.append(
                _delta_record(
                    case_id=base.case_id,
                    kind="score_drop",
                    base=base,
                    candidate=candidate,
                    score_delta=score_delta,
                    summary=f"Case {base.case_id} lost quality relative to baseline.",
                )
            )
        elif not base.passed and candidate.passed:
            improvements.append(
                _delta_record(
                    case_id=base.case_id,
                    kind="fail_to_pass",
                    base=base,
                    candidate=candidate,
                    score_delta=score_delta,
                    summary=f"Case {base.case_id} improved from fail to pass.",
                )
            )
        elif score_delta > 0:
            improvements.append(
                _delta_record(
                    case_id=base.case_id,
                    kind="score_gain",
                    base=base,
                    candidate=candidate,
                    score_delta=score_delta,
                    summary=f"Case {base.case_id} improved relative to baseline.",
                )
            )

    return RunComparison(
        base_run=base_run,
        candidate_run=candidate_run,
        base_avg_score=base_details.summary.avg_score,
        candidate_avg_score=candidate_details.summary.avg_score,
        avg_score_delta=round(candidate_details.summary.avg_score - base_details.summary.avg_score, 3),
        base_pass_rate=base_details.summary.pass_rate,
        candidate_pass_rate=candidate_details.summary.pass_rate,
        pass_rate_delta=round(candidate_details.summary.pass_rate - base_details.summary.pass_rate, 3),
        baseline_failed_cases=base_details.summary.failed_cases,
        candidate_failed_cases=candidate_details.summary.failed_cases,
        regressions=regressions,
        improvements=improvements,
    )


def get_run_details(run_id: str, workspace: str | Path) -> RunDetails:
    db_path = Path(workspace) / "evalops.duckdb"
    _ensure_schema(db_path)
    with duckdb.connect(str(db_path)) as conn:
        summary = _fetch_run_summary(conn, run_id)
        results = _fetch_results(conn, run_id)
    return RunDetails(summary=summary, results=results)


def assess_gate(
    comparison: RunComparison,
    *,
    max_regressions: int = 0,
    max_score_drop: float = 0.0,
    max_pass_rate_drop: float = 0.0,
) -> GateResult:
    reasons: list[str] = []
    score_drop = max(0.0, round(-comparison.avg_score_delta, 3))
    pass_rate_drop = max(0.0, round(-comparison.pass_rate_delta, 3))

    if len(comparison.regressions) > max_regressions:
        reasons.append(
            f"regressions {len(comparison.regressions)} exceeded limit {max_regressions}"
        )
    if score_drop > max_score_drop:
        reasons.append(f"average score drop {score_drop:.3f} exceeded limit {max_score_drop:.3f}")
    if pass_rate_drop > max_pass_rate_drop:
        reasons.append(f"pass-rate drop {pass_rate_drop:.3f} exceeded limit {max_pass_rate_drop:.3f}")

    return GateResult(
        comparison=comparison,
        passed=not reasons,
        reasons=reasons,
        max_regressions=max_regressions,
        max_score_drop=max_score_drop,
        max_pass_rate_drop=max_pass_rate_drop,
    )


def list_runs(workspace: str | Path) -> list[RunSummary]:
    db_path = Path(workspace) / "evalops.duckdb"
    _ensure_schema(db_path)
    with duckdb.connect(str(db_path)) as conn:
        rows = conn.execute(
            """
            SELECT run_id, variant, dataset_path, created_at, total_cases,
                   passed_cases, failed_cases, avg_score, pass_rate, workspace, results_path
            FROM runs
            ORDER BY created_at DESC
            """
        ).fetchall()
    return [
        RunSummary(
            run_id=row[0],
            variant=row[1],
            dataset_path=row[2],
            created_at=row[3],
            total_cases=row[4],
            passed_cases=row[5],
            failed_cases=row[6],
            avg_score=float(row[7]),
            pass_rate=float(row[8]),
            workspace=row[9],
            results_path=row[10],
        )
        for row in rows
    ]


def evaluate_case(case: EvalCase, variant: VariantSpec) -> CaseResult:
    output = render_variant_output(case, variant)
    output_lower = output.lower()

    matched_keywords = [keyword for keyword in case.rubric.required_keywords if keyword.lower() in output_lower]
    missing_keywords = [
        keyword for keyword in case.rubric.required_keywords if keyword.lower() not in output_lower
    ]
    forbidden_keywords_hit = [
        keyword for keyword in case.rubric.forbidden_keywords if keyword.lower() in output_lower
    ]

    base_score = len(matched_keywords) / len(case.rubric.required_keywords) if case.rubric.required_keywords else 1.0
    penalty = 0.25 * len(forbidden_keywords_hit)
    score = max(0.0, min(1.0, round(base_score - penalty, 3)))
    passed = score >= case.rubric.pass_threshold

    notes_parts = [f"matched {len(matched_keywords)}/{len(case.rubric.required_keywords)} required keywords"]
    if missing_keywords:
        notes_parts.append(f"missing keywords: {', '.join(missing_keywords)}")
    if forbidden_keywords_hit:
        notes_parts.append(f"hit forbidden keywords: {', '.join(forbidden_keywords_hit)}")

    return CaseResult(
        case_id=case.case_id,
        prompt=case.prompt,
        expected=case.expected,
        output=output,
        score=score,
        passed=passed,
        matched_keywords=matched_keywords,
        missing_keywords=missing_keywords,
        forbidden_keywords_hit=forbidden_keywords_hit,
        notes="; ".join(notes_parts),
    )


def render_variant_output(case: EvalCase, variant: VariantSpec) -> str:
    if case.case_id in variant.answer_overrides:
        return variant.answer_overrides[case.case_id]

    if variant.mode == "baseline":
        first_sentence = case.reference_answer.split(".")[0].strip()
        if first_sentence and not first_sentence.endswith("."):
            first_sentence += "."
        return f"{first_sentence} {variant.fallback_suffix}".strip()

    return f"{case.reference_answer} {variant.fallback_suffix}".strip()


def build_run_summary(
    run_id: str,
    variant: str,
    dataset_path: str,
    created_at: str,
    results: list[CaseResult],
    workspace: Path,
    results_path: Path,
) -> RunSummary:
    total_cases = len(results)
    passed_cases = sum(1 for item in results if item.passed)
    failed_cases = total_cases - passed_cases
    avg_score = round(sum(item.score for item in results) / total_cases, 3) if results else 0.0
    pass_rate = round(passed_cases / total_cases, 3) if total_cases else 0.0

    return RunSummary(
        run_id=run_id,
        variant=variant,
        dataset_path=dataset_path,
        created_at=created_at,
        total_cases=total_cases,
        passed_cases=passed_cases,
        failed_cases=failed_cases,
        avg_score=avg_score,
        pass_rate=pass_rate,
        workspace=str(workspace),
        results_path=str(results_path),
    )


def format_run_summary(summary: RunSummary) -> str:
    return "\n".join(
        [
            f"Run {summary.run_id}",
            f"Variant: {summary.variant}",
            f"Dataset: {summary.dataset_path}",
            f"Created: {summary.created_at}",
            f"Cases: {summary.total_cases} | Passed: {summary.passed_cases} | Failed: {summary.failed_cases}",
            f"Average score: {summary.avg_score:.3f}",
            f"Pass rate: {summary.pass_rate:.3f}",
            f"Artifacts: {summary.results_path}",
            f"Ledger: {summary.workspace}/evalops.duckdb",
        ]
    )


def format_run_details(details: RunDetails, *, limit: int = 10) -> str:
    lines = [
        format_run_summary(details.summary),
        "",
        "Case traces:",
    ]
    ordered_results = sorted(details.results, key=lambda item: (item.passed, item.score, item.case_id))
    for result in ordered_results[:limit]:
        lines.extend(
            [
                f"- {result.case_id} | score={result.score:.3f} | {'PASS' if result.passed else 'FAIL'}",
                f"  Expected: {result.expected}",
                f"  Output: {result.output}",
                f"  Notes: {result.notes}",
            ]
        )
    remaining = len(ordered_results) - min(len(ordered_results), limit)
    if remaining > 0:
        lines.append(f"... {remaining} more cases not shown")
    return "\n".join(lines)


def format_comparison(comparison: RunComparison, *, limit: int = 10) -> str:
    lines = [
        f"Compare {comparison.base_run} -> {comparison.candidate_run}",
        f"Average score: {comparison.base_avg_score:.3f} -> {comparison.candidate_avg_score:.3f} ({comparison.avg_score_delta:+.3f})",
        f"Pass rate: {comparison.base_pass_rate:.3f} -> {comparison.candidate_pass_rate:.3f} ({comparison.pass_rate_delta:+.3f})",
        f"Failed cases: {comparison.baseline_failed_cases} -> {comparison.candidate_failed_cases}",
        "",
        f"Regressions: {len(comparison.regressions)}",
    ]
    lines.extend(_format_delta_lines(comparison.regressions[:limit]))
    lines.extend(["", f"Improvements: {len(comparison.improvements)}"])
    lines.extend(_format_delta_lines(comparison.improvements[:limit]))
    return "\n".join(lines)


def format_comparison_markdown(comparison: RunComparison, *, limit: int = 10) -> str:
    sections = [
        "# EvalOps Comparison Report",
        "",
        f"- Base run: `{comparison.base_run}`",
        f"- Candidate run: `{comparison.candidate_run}`",
        f"- Average score delta: `{comparison.avg_score_delta:+.3f}`",
        f"- Pass-rate delta: `{comparison.pass_rate_delta:+.3f}`",
        f"- Regressions: `{len(comparison.regressions)}`",
        f"- Improvements: `{len(comparison.improvements)}`",
        "",
        "## Regressions",
        "",
    ]
    sections.extend(_format_delta_markdown(comparison.regressions[:limit]) or ["No regressions."])
    sections.extend(["", "## Improvements", ""])
    sections.extend(_format_delta_markdown(comparison.improvements[:limit]) or ["No improvements."])
    return "\n".join(sections)


def format_gate_result(gate: GateResult, *, limit: int = 10) -> str:
    header = "Gate PASS" if gate.passed else "Gate FAIL"
    lines = [
        header,
        f"Policy: regressions<={gate.max_regressions}, score_drop<={gate.max_score_drop:.3f}, pass_rate_drop<={gate.max_pass_rate_drop:.3f}",
        "",
        format_comparison(gate.comparison, limit=limit),
    ]
    if gate.reasons:
        lines.extend(["", "Reasons:"])
        lines.extend(f"- {reason}" for reason in gate.reasons)
    return "\n".join(lines)


def format_runs_table(runs: list[RunSummary]) -> str:
    lines = ["Recent runs", ""]
    for run in runs:
        lines.append(
            f"{run.run_id} | {run.variant} | avg={run.avg_score:.3f} | pass={run.pass_rate:.3f} | {run.created_at}"
        )
    return "\n".join(lines)


def run_summary_to_dict(summary: RunSummary) -> dict[str, Any]:
    return {
        "run_id": summary.run_id,
        "variant": summary.variant,
        "dataset_path": summary.dataset_path,
        "created_at": summary.created_at,
        "total_cases": summary.total_cases,
        "passed_cases": summary.passed_cases,
        "failed_cases": summary.failed_cases,
        "avg_score": summary.avg_score,
        "pass_rate": summary.pass_rate,
        "workspace": summary.workspace,
        "results_path": summary.results_path,
    }


def run_details_to_dict(details: RunDetails) -> dict[str, Any]:
    return {
        "summary": run_summary_to_dict(details.summary),
        "results": [case_result_to_dict(result) for result in details.results],
    }


def case_result_to_dict(result: CaseResult) -> dict[str, Any]:
    return {
        "case_id": result.case_id,
        "prompt": result.prompt,
        "expected": result.expected,
        "output": result.output,
        "score": result.score,
        "passed": result.passed,
        "matched_keywords": result.matched_keywords,
        "missing_keywords": result.missing_keywords,
        "forbidden_keywords_hit": result.forbidden_keywords_hit,
        "notes": result.notes,
    }


def comparison_to_dict(comparison: RunComparison) -> dict[str, Any]:
    return {
        "base_run": comparison.base_run,
        "candidate_run": comparison.candidate_run,
        "base_avg_score": comparison.base_avg_score,
        "candidate_avg_score": comparison.candidate_avg_score,
        "avg_score_delta": comparison.avg_score_delta,
        "base_pass_rate": comparison.base_pass_rate,
        "candidate_pass_rate": comparison.candidate_pass_rate,
        "pass_rate_delta": comparison.pass_rate_delta,
        "baseline_failed_cases": comparison.baseline_failed_cases,
        "candidate_failed_cases": comparison.candidate_failed_cases,
        "regressions": comparison.regressions,
        "improvements": comparison.improvements,
    }


def gate_result_to_dict(gate: GateResult) -> dict[str, Any]:
    return {
        "passed": gate.passed,
        "reasons": gate.reasons,
        "max_regressions": gate.max_regressions,
        "max_score_drop": gate.max_score_drop,
        "max_pass_rate_drop": gate.max_pass_rate_drop,
        "comparison": comparison_to_dict(gate.comparison),
    }


def runs_to_dict(runs: list[RunSummary]) -> list[dict[str, Any]]:
    return [run_summary_to_dict(run) for run in runs]


def _delta_record(
    *,
    case_id: str,
    kind: str,
    base: CaseResult,
    candidate: CaseResult,
    score_delta: float,
    summary: str,
) -> dict[str, Any]:
    return {
        "case_id": case_id,
        "kind": kind,
        "base_score": base.score,
        "candidate_score": candidate.score,
        "score_delta": score_delta,
        "base_missing_keywords": base.missing_keywords,
        "candidate_missing_keywords": candidate.missing_keywords,
        "candidate_forbidden_keywords": candidate.forbidden_keywords_hit,
        "summary": summary,
    }


def _format_delta_lines(items: list[dict[str, Any]]) -> list[str]:
    if not items:
        return ["- none"]

    lines: list[str] = []
    for item in items:
        delta = item["score_delta"]
        delta_text = "n/a" if delta is None else f"{float(delta):+.3f}"
        lines.append(f"- {item['case_id']} [{item['kind']}] score={delta_text}: {item['summary']}")
        missing = item.get("candidate_missing_keywords") or []
        forbidden = item.get("candidate_forbidden_keywords") or []
        if missing:
            lines.append(f"  missing keywords: {', '.join(missing)}")
        if forbidden:
            lines.append(f"  forbidden hits: {', '.join(forbidden)}")
    return lines


def _format_delta_markdown(items: list[dict[str, Any]]) -> list[str]:
    if not items:
        return []

    rows = [
        "| case_id | kind | score delta | notes |",
        "| --- | --- | ---: | --- |",
    ]
    for item in items:
        notes: list[str] = [item["summary"]]
        missing = item.get("candidate_missing_keywords") or []
        forbidden = item.get("candidate_forbidden_keywords") or []
        if missing:
            notes.append(f"missing: {', '.join(missing)}")
        if forbidden:
            notes.append(f"forbidden: {', '.join(forbidden)}")
        delta = item["score_delta"]
        delta_text = "n/a" if delta is None else f"{float(delta):+.3f}"
        rows.append(f"| `{item['case_id']}` | `{item['kind']}` | `{delta_text}` | {'; '.join(notes)} |")
    return rows


def _write_results_jsonl(path: Path, results: list[CaseResult]) -> None:
    with path.open("w", encoding="utf-8") as handle:
        for result in results:
            handle.write(json.dumps(case_result_to_dict(result)) + "\n")


def _ensure_schema(db_path: Path) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with duckdb.connect(str(db_path)) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS runs (
                run_id TEXT PRIMARY KEY,
                variant TEXT,
                dataset_path TEXT,
                created_at TEXT,
                total_cases INTEGER,
                passed_cases INTEGER,
                failed_cases INTEGER,
                avg_score DOUBLE,
                pass_rate DOUBLE,
                workspace TEXT,
                results_path TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS results (
                run_id TEXT,
                case_id TEXT,
                prompt TEXT,
                expected TEXT,
                output TEXT,
                score DOUBLE,
                passed BOOLEAN,
                matched_keywords_json TEXT,
                missing_keywords_json TEXT,
                forbidden_keywords_json TEXT,
                notes TEXT
            )
            """
        )


def _store_run(db_path: Path, summary: RunSummary, results: list[CaseResult]) -> None:
    with duckdb.connect(str(db_path)) as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO runs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                summary.run_id,
                summary.variant,
                summary.dataset_path,
                summary.created_at,
                summary.total_cases,
                summary.passed_cases,
                summary.failed_cases,
                summary.avg_score,
                summary.pass_rate,
                summary.workspace,
                summary.results_path,
            ],
        )
        conn.execute("DELETE FROM results WHERE run_id = ?", [summary.run_id])
        conn.executemany(
            """
            INSERT INTO results VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                [
                    summary.run_id,
                    result.case_id,
                    result.prompt,
                    result.expected,
                    result.output,
                    result.score,
                    result.passed,
                    json.dumps(result.matched_keywords),
                    json.dumps(result.missing_keywords),
                    json.dumps(result.forbidden_keywords_hit),
                    result.notes,
                ]
                for result in results
            ],
        )


def _fetch_run_summary(conn: duckdb.DuckDBPyConnection, run_id: str) -> RunSummary:
    row = conn.execute(
        """
        SELECT run_id, variant, dataset_path, created_at, total_cases,
               passed_cases, failed_cases, avg_score, pass_rate, workspace, results_path
        FROM runs WHERE run_id = ?
        """,
        [run_id],
    ).fetchone()
    if row is None:
        raise ValueError(f"Unknown run_id: {run_id}")
    return RunSummary(
        run_id=row[0],
        variant=row[1],
        dataset_path=row[2],
        created_at=row[3],
        total_cases=row[4],
        passed_cases=row[5],
        failed_cases=row[6],
        avg_score=float(row[7]),
        pass_rate=float(row[8]),
        workspace=row[9],
        results_path=row[10],
    )


def _fetch_results(conn: duckdb.DuckDBPyConnection, run_id: str) -> list[CaseResult]:
    rows = conn.execute(
        """
        SELECT case_id, prompt, expected, output, score, passed,
               matched_keywords_json, missing_keywords_json, forbidden_keywords_json, notes
        FROM results WHERE run_id = ?
        ORDER BY case_id ASC
        """,
        [run_id],
    ).fetchall()
    return [
        CaseResult(
            case_id=row[0],
            prompt=row[1],
            expected=row[2],
            output=row[3],
            score=float(row[4]),
            passed=bool(row[5]),
            matched_keywords=json.loads(row[6]),
            missing_keywords=json.loads(row[7]),
            forbidden_keywords_hit=json.loads(row[8]),
            notes=row[9],
        )
        for row in rows
    ]


def _as_str(item: dict[str, Any], key: str, index: int) -> str:
    value = item.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"Dataset row {index} requires non-empty string field '{key}'.")
    return value.strip()


def _as_list(value: Any, index: int) -> list[str]:
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return []
        if text.startswith("["):
            decoded = json.loads(text)
            if not isinstance(decoded, list) or not all(isinstance(item, str) for item in decoded):
                raise ValueError(f"Dataset row {index} lists must contain only strings.")
            return [item.strip() for item in decoded if item.strip()]
        delimiter = "|" if "|" in text else ";"
        return [item.strip() for item in text.split(delimiter) if item.strip()]
    if not isinstance(value, list):
        raise ValueError(f"Dataset row {index} expected a list value.")
    if not all(isinstance(item, str) for item in value):
        raise ValueError(f"Dataset row {index} lists must contain only strings.")
    return [item.strip() for item in value if item.strip()]
