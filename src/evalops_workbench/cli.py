from __future__ import annotations

import argparse
import json
from pathlib import Path

from .catalog import load_project
from .workbench import (
    compare_runs,
    comparison_to_dict,
    format_comparison,
    format_run_summary,
    format_runs_table,
    list_runs,
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
    run_parser.add_argument("--dataset", required=True, help="Path to a JSON dataset file.")
    run_parser.add_argument("--variant", required=True, help="Variant name or JSON file path.")
    run_parser.add_argument(
        "--workspace",
        default=".evalops",
        help="Directory for DuckDB ledger and JSONL artifacts.",
    )
    run_parser.add_argument(
        "--format",
        choices=("text", "json"),
        default="text",
        help="Output format.",
    )

    compare_parser = subparsers.add_parser("compare", help="Compare two historical runs.")
    compare_parser.add_argument("--base", required=True, help="Base run ID.")
    compare_parser.add_argument("--candidate", required=True, help="Candidate run ID.")
    compare_parser.add_argument(
        "--workspace",
        default=".evalops",
        help="Directory containing the DuckDB ledger.",
    )
    compare_parser.add_argument(
        "--format",
        choices=("text", "json"),
        default="text",
        help="Output format.",
    )

    runs_parser = subparsers.add_parser("runs", help="List recent evaluation runs.")
    runs_parser.add_argument(
        "--workspace",
        default=".evalops",
        help="Directory containing the DuckDB ledger.",
    )
    runs_parser.add_argument(
        "--format",
        choices=("text", "json"),
        default="text",
        help="Output format.",
    )
    return parser


def run(argv: list[str] | None = None) -> str:
    args = build_parser().parse_args(argv)
    project = load_project()

    if args.command == "summary":
        return "\n".join([
            project.name,
            "=" * len(project.name),
            project.summary,
            "",
            f"Problem: {project.problem}",
            f"Users: {project.users}",
            f"Stage: {project.stage}",
            f"Track: {project.track}",
        ])
    if args.command == "capabilities":
        lines = [project.name, "", "Core capabilities:"]
        lines.extend(f"- {item}" for item in project.mvp)
        return "\n".join(lines)
    if args.command == "roadmap":
        roadmap_path = Path(__file__).resolve().parents[2] / "docs" / "roadmap.md"
        return roadmap_path.read_text(encoding="utf-8").strip()
    if args.command == "run":
        summary = run_evaluation(
            dataset_path=args.dataset,
            variant=args.variant,
            workspace=args.workspace,
            repo_root=Path(__file__).resolve().parents[2],
        )
        if args.format == "json":
            return json.dumps(run_summary_to_dict(summary), indent=2)
        return format_run_summary(summary)
    if args.command == "compare":
        comparison = compare_runs(
            base_run=args.base,
            candidate_run=args.candidate,
            workspace=args.workspace,
        )
        if args.format == "json":
            return json.dumps(comparison_to_dict(comparison), indent=2)
        return format_comparison(comparison)
    if args.command == "runs":
        runs = list_runs(args.workspace)
        if args.format == "json":
            return json.dumps(runs_to_dict(runs), indent=2)
        return format_runs_table(runs)
    raise ValueError(f"Unsupported command: {args.command}")


def main(argv: list[str] | None = None) -> int:
    print(run(argv))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
