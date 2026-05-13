from __future__ import annotations

import argparse
import json
from pathlib import Path

from .catalog import load_project
from .workbench import (
    GateResult,
    RunComparison,
    assess_gate,
    compare_runs,
    comparison_to_dict,
    format_comparison,
    format_comparison_markdown,
    format_gate_result,
    format_run_details,
    format_run_summary,
    format_runs_table,
    gate_result_to_dict,
    get_run_details,
    list_runs,
    run_details_to_dict,
    run_evaluation,
    run_summary_to_dict,
    runs_to_dict,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="evalops-workbench", description="Operate EvalOps Workbench.")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("summary", help="Print product summary.")
    subparsers.add_parser("capabilities", help="Print initial capabilities.")
    subparsers.add_parser("roadmap", help="Print roadmap.")

    run_parser = subparsers.add_parser("run", help="Run an evaluation dataset against a variant.")
    run_parser.add_argument("--dataset", required=True, help="Path to a JSON or CSV dataset file.")
    run_parser.add_argument("--variant", required=True, help="Variant name or JSON file path.")
    run_parser.add_argument("--workspace", default=".evalops", help="Directory for DuckDB ledger and JSONL artifacts.")
    run_parser.add_argument("--format", choices=("text", "json"), default="text", help="Output format.")

    compare_parser = subparsers.add_parser("compare", help="Compare two historical runs.")
    compare_parser.add_argument("--base", required=True, help="Base run ID.")
    compare_parser.add_argument("--candidate", required=True, help="Candidate run ID.")
    compare_parser.add_argument("--workspace", default=".evalops", help="Directory containing the DuckDB ledger.")
    compare_parser.add_argument("--format", choices=("text", "json", "markdown"), default="text", help="Output format.")
    compare_parser.add_argument("--limit", type=int, default=10, help="Maximum cases to print.")
    compare_parser.add_argument("--report", help="Optional output path for a saved report.")

    show_parser = subparsers.add_parser("show", help="Inspect a single historical run.")
    show_parser.add_argument("--run", required=True, help="Run ID to inspect.")
    show_parser.add_argument("--workspace", default=".evalops", help="Directory containing the DuckDB ledger.")
    show_parser.add_argument("--format", choices=("text", "json"), default="text", help="Output format.")
    show_parser.add_argument("--limit", type=int, default=10, help="Maximum cases to print.")
    show_parser.add_argument("--report", help="Optional output path for a saved report.")

    gate_parser = subparsers.add_parser("gate", help="Enforce regression thresholds for CI or deploy gates.")
    gate_parser.add_argument("--base", required=True, help="Base run ID.")
    gate_parser.add_argument("--candidate", required=True, help="Candidate run ID.")
    gate_parser.add_argument("--workspace", default=".evalops", help="Directory containing the DuckDB ledger.")
    gate_parser.add_argument("--max-regressions", type=int, default=0, help="Maximum allowed regressions.")
    gate_parser.add_argument("--max-score-drop", type=float, default=0.0, help="Maximum allowed average score drop.")
    gate_parser.add_argument("--max-pass-rate-drop", type=float, default=0.0, help="Maximum allowed pass-rate drop.")
    gate_parser.add_argument("--format", choices=("text", "json", "markdown"), default="text", help="Output format.")
    gate_parser.add_argument("--limit", type=int, default=10, help="Maximum cases to print.")
    gate_parser.add_argument("--report", help="Optional output path for a saved report.")

    runs_parser = subparsers.add_parser("runs", help="List recent evaluation runs.")
    runs_parser.add_argument("--workspace", default=".evalops", help="Directory containing the DuckDB ledger.")
    runs_parser.add_argument("--format", choices=("text", "json"), default="text", help="Output format.")
    return parser


def execute(argv: list[str] | None = None) -> tuple[str, int]:
    args = build_parser().parse_args(argv)
    project = load_project()
    repo_root = Path(__file__).resolve().parents[2]

    if args.command == "summary":
        return (
            "\n".join(
                [
                    project.name,
                    "=" * len(project.name),
                    project.summary,
                    "",
                    f"Problem: {project.problem}",
                    f"Users: {project.users}",
                    f"Stage: {project.stage}",
                    f"Track: {project.track}",
                ]
            ),
            0,
        )

    if args.command == "capabilities":
        lines = [project.name, "", "Core capabilities:"]
        lines.extend(f"- {item}" for item in project.mvp)
        return "\n".join(lines), 0

    if args.command == "roadmap":
        roadmap_path = repo_root / "docs" / "roadmap.md"
        return roadmap_path.read_text(encoding="utf-8").strip(), 0

    if args.command == "run":
        summary = run_evaluation(
            dataset_path=args.dataset,
            variant=args.variant,
            workspace=args.workspace,
            repo_root=repo_root,
        )
        if args.format == "json":
            return json.dumps(run_summary_to_dict(summary), indent=2), 0
        return format_run_summary(summary), 0

    if args.command == "compare":
        comparison = compare_runs(base_run=args.base, candidate_run=args.candidate, workspace=args.workspace)
        output = _render_comparison(comparison, output_format=args.format, limit=args.limit)
        _write_report_if_requested(args.report, output)
        return output, 0

    if args.command == "show":
        details = get_run_details(args.run, args.workspace)
        if args.format == "json":
            output = json.dumps(run_details_to_dict(details), indent=2)
        else:
            output = format_run_details(details, limit=args.limit)
        _write_report_if_requested(args.report, output)
        return output, 0

    if args.command == "gate":
        comparison = compare_runs(base_run=args.base, candidate_run=args.candidate, workspace=args.workspace)
        gate = assess_gate(
            comparison,
            max_regressions=args.max_regressions,
            max_score_drop=args.max_score_drop,
            max_pass_rate_drop=args.max_pass_rate_drop,
        )
        if args.format == "json":
            output = json.dumps(gate_result_to_dict(gate), indent=2)
        elif args.format == "markdown":
            output = _gate_markdown(gate, limit=args.limit)
        else:
            output = format_gate_result(gate, limit=args.limit)
        _write_report_if_requested(args.report, output)
        return output, 0 if gate.passed else 2

    if args.command == "runs":
        runs = list_runs(args.workspace)
        if args.format == "json":
            return json.dumps(runs_to_dict(runs), indent=2), 0
        return format_runs_table(runs), 0

    raise ValueError(f"Unsupported command: {args.command}")


def run(argv: list[str] | None = None) -> str:
    return execute(argv)[0]


def main(argv: list[str] | None = None) -> int:
    output, exit_code = execute(argv)
    print(output)
    return exit_code


def _render_comparison(comparison: RunComparison, *, output_format: str, limit: int) -> str:
    if output_format == "json":
        return json.dumps(comparison_to_dict(comparison), indent=2)
    if output_format == "markdown":
        return format_comparison_markdown(comparison, limit=limit)
    return format_comparison(comparison, limit=limit)


def _gate_markdown(gate: GateResult, *, limit: int) -> str:
    verdict = "PASS" if gate.passed else "FAIL"
    lines = [
        f"# EvalOps Gate {verdict}",
        "",
        f"- Max regressions: `{gate.max_regressions}`",
        f"- Max score drop: `{gate.max_score_drop:.3f}`",
        f"- Max pass-rate drop: `{gate.max_pass_rate_drop:.3f}`",
        "",
    ]
    if gate.reasons:
        lines.append("## Reasons")
        lines.append("")
        lines.extend(f"- {reason}" for reason in gate.reasons)
        lines.append("")
    lines.append(format_comparison_markdown(gate.comparison, limit=limit))
    return "\n".join(lines)


def _write_report_if_requested(report_path: str | None, output: str) -> None:
    if not report_path:
        return
    path = Path(report_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(output + "\n", encoding="utf-8")


if __name__ == "__main__":
    raise SystemExit(main())
