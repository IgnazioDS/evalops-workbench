from __future__ import annotations

import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from evalops_workbench.workbench import compare_runs, load_dataset, run_evaluation


class WorkbenchTests(unittest.TestCase):
    def setUp(self) -> None:
        repo_root = Path(__file__).resolve().parent.parent
        self.repo_root = repo_root
        self.dataset = repo_root / "examples" / "support_qa.json"
        self.csv_dataset = repo_root / "examples" / "support_qa.csv"

    def test_load_dataset(self) -> None:
        dataset = load_dataset(self.dataset)
        self.assertEqual(len(dataset), 4)
        self.assertEqual(dataset[0].case_id, "refund_policy")
        self.assertIn("14 days", dataset[0].rubric.required_keywords)

    def test_load_csv_dataset(self) -> None:
        dataset = load_dataset(self.csv_dataset)
        self.assertEqual(len(dataset), 4)
        self.assertEqual(dataset[1].case_id, "sla_enterprise")
        self.assertIn("Slack", dataset[1].rubric.required_keywords)

    def test_run_evaluation_creates_ledger_and_jsonl(self) -> None:
        with TemporaryDirectory() as tmpdir:
            summary = run_evaluation(
                dataset_path=self.dataset,
                variant="prompt_v2",
                workspace=tmpdir,
                repo_root=self.repo_root,
            )

            self.assertEqual(summary.variant, "prompt_v2")
            self.assertEqual(summary.total_cases, 4)
            self.assertEqual(summary.failed_cases, 0)
            self.assertTrue(Path(summary.results_path).exists())
            self.assertTrue((Path(tmpdir) / "evalops.duckdb").exists())

            lines = Path(summary.results_path).read_text(encoding="utf-8").strip().splitlines()
            self.assertEqual(len(lines), 4)
            payload = json.loads(lines[0])
            self.assertIn("score", payload)
            self.assertIn("passed", payload)

    def test_compare_runs_detects_regressions(self) -> None:
        with TemporaryDirectory() as tmpdir:
            base = run_evaluation(
                dataset_path=self.dataset,
                variant="prompt_v2",
                workspace=tmpdir,
                repo_root=self.repo_root,
            )
            candidate = run_evaluation(
                dataset_path=self.dataset,
                variant="prompt_v1",
                workspace=tmpdir,
                repo_root=self.repo_root,
            )
            comparison = compare_runs(base.run_id, candidate.run_id, tmpdir)

            self.assertLess(comparison.candidate_avg_score, comparison.base_avg_score)
            self.assertGreater(len(comparison.regressions), 0)
            self.assertEqual(comparison.improvements, [])


if __name__ == "__main__":
    unittest.main()
