"""Integration test: the public benchmark runner over the workbench engine."""
from __future__ import annotations

import unittest

from evalops_workbench.benchmark_runner import run_benchmark


class BenchmarkRunnerTests(unittest.TestCase):
    def test_runs_and_produces_valid_artifact(self) -> None:
        artifact = run_benchmark(write=False)

        self.assertEqual(artifact["system"], "evalops")
        self.assertEqual(artifact["benchmark_type"], "eval")
        self.assertEqual(artifact["schema_version"], 1)
        self.assertTrue(artifact["run_id"].startswith("evalops-"))

        metrics = artifact["metrics"]
        self.assertEqual(metrics["baseline_variant"], "prompt_v1")
        self.assertEqual(metrics["candidate_variant"], "prompt_v2")
        self.assertIn(metrics["gate_verdict"], {"pass", "fail"})
        # On the committed fixture the grounded candidate must not lose ground.
        self.assertGreaterEqual(metrics["candidate_pass_rate"], metrics["baseline_pass_rate"])

        self.assertEqual(len(artifact["variants"]), 2)
        for variant in artifact["variants"]:
            self.assertEqual(set(variant), {"name", "pass_rate", "avg_score", "passed_cases", "total_cases"})

    def test_run_id_is_deterministic(self) -> None:
        first = run_benchmark(write=False)["run_id"]
        second = run_benchmark(write=False)["run_id"]
        self.assertEqual(first, second)


if __name__ == "__main__":
    unittest.main()
