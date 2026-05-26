"""Unit tests for the EvalOps evaluation engine."""
from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from evalops_workbench.eval import artifact as artifact_mod
from evalops_workbench.eval import baseline as baseline_mod
from evalops_workbench.eval import ledger as ledger_mod
from evalops_workbench.eval.cases import Case, load_cases
from evalops_workbench.eval.normalize import normalize_answer, tokenize
from evalops_workbench.eval.runner import compare, run_target
from evalops_workbench.eval.scorers import (
    contains_gold,
    exact_match,
    score_prediction,
    token_f1,
)
from evalops_workbench.eval.targets import (
    first_sentence,
    get_target,
    overlap_sentence,
    span_extract,
    split_sentences,
)


class NormalizeTests(unittest.TestCase):
    def test_strips_articles_punctuation_and_case(self) -> None:
        self.assertEqual(normalize_answer("The Nile."), "nile")
        self.assertEqual(normalize_answer("  A  House! "), "house")

    def test_empty(self) -> None:
        self.assertEqual(normalize_answer(""), "")
        self.assertEqual(tokenize("the a an"), [])

    def test_tokenize(self) -> None:
        self.assertEqual(tokenize("Hello, World!"), ["hello", "world"])


class ScorerTests(unittest.TestCase):
    def test_exact_match_normalizes(self) -> None:
        self.assertEqual(exact_match("Paris", ["paris"]), 1.0)
        self.assertEqual(exact_match("Paris, France", ["Paris"]), 0.0)

    def test_token_f1_bounds(self) -> None:
        self.assertEqual(token_f1("Paris", ["Paris"]), 1.0)
        self.assertEqual(token_f1("London", ["Paris"]), 0.0)
        partial = token_f1("the answer is Paris", ["Paris"])
        self.assertTrue(0.0 < partial < 1.0)

    def test_contains_gold(self) -> None:
        self.assertEqual(contains_gold("the capital is Paris", ["Paris"]), 1.0)
        self.assertEqual(contains_gold("London", ["Paris"]), 0.0)

    def test_score_prediction_returns_all(self) -> None:
        scores = score_prediction("Paris", ["Paris"])
        self.assertEqual(set(scores), {"exact_match", "token_f1", "contains_gold"})


class CaseLoaderTests(unittest.TestCase):
    def _write(self, name: str, text: str) -> Path:
        tmp = Path(tempfile.mkdtemp()) / name
        tmp.write_text(text, encoding="utf-8")
        return tmp

    def test_load_jsonl_and_coerce_string_answer(self) -> None:
        path = self._write(
            "c.jsonl",
            '{"id":"1","question":"q","context":"c","answers":"a"}\n',
        )
        cases = load_cases(path)
        self.assertEqual(len(cases), 1)
        self.assertEqual(cases[0].answers, ("a",))

    def test_missing_field_raises(self) -> None:
        path = self._write("c.jsonl", '{"id":"1","question":"q","context":"c"}\n')
        with self.assertRaises(ValueError):
            load_cases(path)

    def test_duplicate_ids_raise(self) -> None:
        path = self._write(
            "c.jsonl",
            '{"id":"1","question":"q","context":"c","answers":"a"}\n'
            '{"id":"1","question":"q","context":"c","answers":"b"}\n',
        )
        with self.assertRaises(ValueError):
            load_cases(path)

    def test_unsupported_extension_raises(self) -> None:
        path = self._write("c.txt", "nope")
        with self.assertRaises(ValueError):
            load_cases(path)

    def test_missing_file_raises(self) -> None:
        with self.assertRaises(FileNotFoundError):
            load_cases(Path(tempfile.mkdtemp()) / "absent.jsonl")


class TargetTests(unittest.TestCase):
    def test_split_sentences(self) -> None:
        self.assertEqual(split_sentences("One. Two! Three?"), ["One.", "Two!", "Three?"])

    def test_candidate_extracts_entity(self) -> None:
        case = Case(
            "t",
            "Where is the Eiffel Tower located?",
            "The Eiffel Tower is located in Paris. It opened in 1889.",
            ("Paris",),
        )
        self.assertEqual(span_extract(case), "Paris")
        self.assertEqual(overlap_sentence(case), "The Eiffel Tower is located in Paris.")
        self.assertEqual(first_sentence(case), "The Eiffel Tower is located in Paris.")

    def test_candidate_extracts_year_and_number(self) -> None:
        when = Case("w", "When was the telephone patented?", "The telephone was patented in 1876.", ("1876",))
        self.assertEqual(span_extract(when), "1876")
        howmany = Case("h", "How many continents are there on Earth?", "There are 7 continents on Earth.", ("7",))
        self.assertEqual(span_extract(howmany), "7")

    def test_candidate_regresses_on_distractor(self) -> None:
        case = Case(
            "adv",
            "Who composed the Ninth Symphony?",
            "The Ninth Symphony was first performed in Vienna and is attributed to Beethoven.",
            ("Beethoven",),
        )
        # The candidate grabs the first novel entity (the distractor), not the answer.
        self.assertEqual(span_extract(case), "Vienna")

    def test_get_target_unknown_raises(self) -> None:
        with self.assertRaises(ValueError):
            get_target("nope")


class RunnerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.cases = [
            Case("good", "Where is the Eiffel Tower located?",
                 "The Eiffel Tower is located in Paris.", ("Paris",)),
            Case("adv", "Who composed the Ninth Symphony?",
                 "The Ninth Symphony premiered in Vienna and is attributed to Beethoven.", ("Beethoven",)),
        ]

    def test_run_target_aggregate(self) -> None:
        result = run_target("span_extract", get_target("span_extract"), self.cases)
        self.assertEqual(result.n_cases, 2)
        self.assertIn("token_f1", result.aggregate)
        self.assertEqual(len(result.case_scores), 2)

    def test_compare_finds_only_real_regressions(self) -> None:
        baseline = run_target("overlap_sentence", get_target("overlap_sentence"), self.cases)
        candidate = run_target("span_extract", get_target("span_extract"), self.cases)
        regressions = compare(baseline, candidate, metric="token_f1")
        regressed = {r.case_id for r in regressions}
        self.assertIn("adv", regressed)
        self.assertNotIn("good", regressed)


class BaselineGateTests(unittest.TestCase):
    def _result(self, f1: float):
        case = Case("x", "q", "c", ("a",))
        result = run_target("first_sentence", lambda _c: "a", [case])
        # Override aggregate for a controlled gate test.
        object.__setattr__(result, "aggregate", {"token_f1": f1, "exact_match": f1, "contains_gold": f1})
        return result

    def test_no_pin_establishes_contract(self) -> None:
        verdict = baseline_mod.evaluate_gate(self._result(0.5), None)
        self.assertTrue(verdict.passed)
        self.assertIsNone(verdict.pinned)

    def test_above_floor_passes_below_fails(self) -> None:
        pinned = {"aggregate": {"token_f1": 0.60}}
        self.assertTrue(baseline_mod.evaluate_gate(self._result(0.59), pinned).passed)
        self.assertFalse(baseline_mod.evaluate_gate(self._result(0.50), pinned).passed)

    def test_pin_roundtrip(self) -> None:
        path = Path(tempfile.mkdtemp()) / "pin.json"
        result = self._result(0.7)
        baseline_mod.save_pinned(path, result)
        loaded = baseline_mod.load_pinned(path)
        self.assertEqual(loaded["aggregate"]["token_f1"], 0.7)


class LedgerTests(unittest.TestCase):
    def test_append_trim_previous(self) -> None:
        path = Path(tempfile.mkdtemp()) / "hist.json"
        self.assertIsNone(ledger_mod.previous_record(path))
        ledger_mod.append_record(path, {"run_id": "a", "generated_at": "t1"})
        ledger_mod.append_record(path, {"run_id": "b", "generated_at": "t2"}, keep=5)
        self.assertEqual(ledger_mod.previous_record(path)["run_id"], "b")
        self.assertEqual(len(ledger_mod.read_records(path)), 2)

    def test_trim_to_keep(self) -> None:
        path = Path(tempfile.mkdtemp()) / "hist.json"
        for i in range(10):
            ledger_mod.append_record(path, {"run_id": str(i)}, keep=3)
        records = ledger_mod.read_records(path)
        self.assertEqual(len(records), 3)
        self.assertEqual(records[-1]["run_id"], "9")


class ArtifactTests(unittest.TestCase):
    def _results(self):
        cases = [
            Case("good", "Where is the Eiffel Tower located?",
                 "The Eiffel Tower is located in Paris.", ("Paris",)),
            Case("adv", "Who composed the Ninth Symphony?",
                 "The Ninth Symphony premiered in Vienna and is attributed to Beethoven.", ("Beethoven",)),
        ]
        return {name: run_target(name, get_target(name), cases)
                for name in ("first_sentence", "overlap_sentence", "span_extract")}

    def test_build_artifact_shape(self) -> None:
        results = self._results()
        regressions = compare(results["overlap_sentence"], results["span_extract"])
        verdict = baseline_mod.evaluate_gate(results["span_extract"], None)
        art = artifact_mod.build_artifact(
            fixture_id="benchmark-v1",
            fixture_rel="examples/benchmark-v1/cases.jsonl",
            results=results,
            baseline_name="overlap_sentence",
            candidate_name="span_extract",
            regressions=regressions,
            verdict=verdict,
            previous=None,
            generated_at="2026-05-26T00:00:00Z",
        )
        self.assertEqual(art["system"], "evalops")
        self.assertEqual(art["benchmark_type"], "eval")
        self.assertEqual(art["schema_version"], 1)
        self.assertTrue(art["run_id"].startswith("evalops-2026-05-26-"))
        self.assertIsNone(art["previous_run"])
        self.assertEqual(len(art["variants"]), 3)
        self.assertIn("pass_rate", art["metrics"])

    def test_previous_run_delta(self) -> None:
        results = self._results()
        verdict = baseline_mod.evaluate_gate(results["span_extract"], None)
        previous = {"run_id": "prev", "generated_at": "2026-05-25T00:00:00Z",
                    "token_f1": 0.10, "exact_match": 0.10, "regressions": 1}
        art = artifact_mod.build_artifact(
            fixture_id="benchmark-v1", fixture_rel="x", results=results,
            baseline_name="overlap_sentence", candidate_name="span_extract",
            regressions=[], verdict=verdict, previous=previous,
            generated_at="2026-05-26T00:00:00Z",
        )
        self.assertEqual(art["previous_run"]["run_id"], "prev")
        self.assertIn("token_f1", art["previous_run"]["delta"])

    def test_slim_record_keys(self) -> None:
        results = self._results()
        verdict = baseline_mod.evaluate_gate(results["span_extract"], None)
        art = artifact_mod.build_artifact(
            fixture_id="benchmark-v1", fixture_rel="x", results=results,
            baseline_name="overlap_sentence", candidate_name="span_extract",
            regressions=[], verdict=verdict, previous=None,
            generated_at="2026-05-26T00:00:00Z",
        )
        record = artifact_mod.slim_record(art)
        self.assertEqual(
            set(record),
            {"run_id", "generated_at", "pass_rate", "token_f1", "exact_match",
             "regressions", "regressed_ids", "gate_verdict", "variants"},
        )


if __name__ == "__main__":
    unittest.main()
