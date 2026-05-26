"""Unit tests for the /api/benchmark-latest serverless function.

The module file name contains a hyphen (matching the Vercel route), so it is
loaded by path rather than imported by name.
"""
from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

_API_DIR = Path(__file__).resolve().parent.parent / "api"


def _load_endpoint():
    spec = importlib.util.spec_from_file_location(
        "benchmark_latest_endpoint", _API_DIR / "benchmark-latest.py"
    )
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


class BenchmarkEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        self.mod = _load_endpoint()
        self._orig_artifact = self.mod.ARTIFACT_FILE

    def tearDown(self) -> None:
        self.mod.ARTIFACT_FILE = self._orig_artifact

    def test_returns_committed_artifact(self) -> None:
        artifact = {
            "system": "evalops",
            "benchmark_type": "eval",
            "run_id": "evalops-2026-05-26-abc12345",
            "metrics": {"token_f1": 0.65},
            "schema_version": 1,
            "generated_at": "2026-05-26T00:00:00Z",
        }
        path = Path(tempfile.mkdtemp()) / "_benchmark_latest.json"
        path.write_text(json.dumps(artifact), encoding="utf-8")
        self.mod.ARTIFACT_FILE = path

        response = self.mod.build_response()
        self.assertEqual(response["system"], "evalops")
        self.assertEqual(response["run_id"], "evalops-2026-05-26-abc12345")
        self.assertEqual(response["schema_version"], 1)

    def test_pending_when_artifact_missing(self) -> None:
        self.mod.ARTIFACT_FILE = Path("/nonexistent/_benchmark_latest.json")
        response = self.mod.build_response()
        self.assertEqual(response["system"], "evalops")
        self.assertEqual(response["status"], "pending")
        self.assertEqual(response["benchmark_type"], "eval")
        self.assertIsNone(response["run_id"])
        self.assertEqual(response["schema_version"], 1)

    def test_seeded_repo_artifact_is_valid(self) -> None:
        """The committed artifact in the repo must be schema-valid."""
        response = self.mod.build_response()
        # In the repo the seed exists; if a developer cleared it, accept pending.
        if response.get("status") == "pending":
            self.skipTest("no seeded artifact present")
        self.assertEqual(response["system"], "evalops")
        self.assertEqual(response["schema_version"], 1)
        self.assertIn("metrics", response)
        self.assertIn("generated_at", response)


if __name__ == "__main__":
    unittest.main()
