from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from evalops_workbench.cli import execute, run


class CliTests(unittest.TestCase):
    def setUp(self) -> None:
        repo_root = Path(__file__).resolve().parent.parent
        self.dataset = str(repo_root / "examples" / "support_qa.json")

    def test_summary(self) -> None:
        output = run(["summary"])
        self.assertIn("EvalOps Workbench", output)
        self.assertIn("LLM teams lack a lightweight way to compare prompt and tool changes before shipping.", output)

    def test_capabilities(self) -> None:
        output = run(["capabilities"])
        self.assertIn("Core capabilities:", output)
        self.assertIn("Load datasets from JSON or CSV", output)

    def test_roadmap(self) -> None:
        output = run(["roadmap"])
        self.assertIn("# Roadmap", output)
        self.assertIn("## Phase 1", output)

    def test_run_command(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            output = run(
                [
                    "run",
                    "--dataset",
                    self.dataset,
                    "--variant",
                    "prompt_v2",
                    "--workspace",
                    tmpdir,
                ]
            )
        self.assertIn("Run run_", output)
        self.assertIn("Average score:", output)

    def test_run_command_json(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            output = run(
                [
                    "run",
                    "--dataset",
                    self.dataset,
                    "--variant",
                    "prompt_v2",
                    "--workspace",
                    tmpdir,
                    "--format",
                    "json",
                ]
            )
        payload = json.loads(output)
        self.assertEqual(payload["variant"], "prompt_v2")
        self.assertEqual(payload["total_cases"], 4)

    def test_compare_command(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            first = json.loads(
                run(
                    [
                        "run",
                        "--dataset",
                        self.dataset,
                        "--variant",
                        "prompt_v2",
                        "--workspace",
                        tmpdir,
                        "--format",
                        "json",
                    ]
                )
            )
            second = json.loads(
                run(
                    [
                        "run",
                        "--dataset",
                        self.dataset,
                        "--variant",
                        "prompt_v1",
                        "--workspace",
                        tmpdir,
                        "--format",
                        "json",
                    ]
                )
            )
            output = run(
                [
                    "compare",
                    "--base",
                    first["run_id"],
                    "--candidate",
                    second["run_id"],
                    "--workspace",
                    tmpdir,
                ]
            )
        self.assertIn("Regressions:", output)
        self.assertIn("pass_to_fail", output)

    def test_show_command(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            first = json.loads(
                run(
                    [
                        "run",
                        "--dataset",
                        self.dataset,
                        "--variant",
                        "prompt_v1",
                        "--workspace",
                        tmpdir,
                        "--format",
                        "json",
                    ]
                )
            )
            output = run(
                [
                    "show",
                    "--run",
                    first["run_id"],
                    "--workspace",
                    tmpdir,
                    "--limit",
                    "2",
                ]
            )
        self.assertIn("Case traces:", output)
        self.assertIn("FAIL", output)

    def test_gate_command_returns_nonzero(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            first = json.loads(
                run(
                    [
                        "run",
                        "--dataset",
                        self.dataset,
                        "--variant",
                        "prompt_v2",
                        "--workspace",
                        tmpdir,
                        "--format",
                        "json",
                    ]
                )
            )
            second = json.loads(
                run(
                    [
                        "run",
                        "--dataset",
                        self.dataset,
                        "--variant",
                        "prompt_v1",
                        "--workspace",
                        tmpdir,
                        "--format",
                        "json",
                    ]
                )
            )
            output, exit_code = execute(
                [
                    "gate",
                    "--base",
                    first["run_id"],
                    "--candidate",
                    second["run_id"],
                    "--workspace",
                    tmpdir,
                ]
            )
        self.assertEqual(exit_code, 2)
        self.assertIn("Gate FAIL", output)

    def test_compare_markdown_report(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            report_path = Path(tmpdir) / "reports" / "comparison.md"
            first = json.loads(
                run(
                    [
                        "run",
                        "--dataset",
                        self.dataset,
                        "--variant",
                        "prompt_v2",
                        "--workspace",
                        tmpdir,
                        "--format",
                        "json",
                    ]
                )
            )
            second = json.loads(
                run(
                    [
                        "run",
                        "--dataset",
                        self.dataset,
                        "--variant",
                        "prompt_v1",
                        "--workspace",
                        tmpdir,
                        "--format",
                        "json",
                    ]
                )
            )
            output = run(
                [
                    "compare",
                    "--base",
                    first["run_id"],
                    "--candidate",
                    second["run_id"],
                    "--workspace",
                    tmpdir,
                    "--format",
                    "markdown",
                    "--report",
                    str(report_path),
                ]
            )
            self.assertTrue(report_path.exists())
        self.assertIn("# EvalOps Comparison Report", output)


if __name__ == "__main__":
    unittest.main()
