# benchmark-v1

A small, fully reproducible extractive question-answering benchmark. It is the
workload behind EvalOps Workbench's public telemetry: a real evaluation that
runs nightly, persists its result to this repo, and is served at
`/api/benchmark-latest`.

## What it measures

Three deterministic strategies answer each question from its context passage:

| Variant | Strategy |
| --- | --- |
| `first_sentence` | Return the opening sentence (floor). |
| `overlap_sentence` | **Baseline.** Return the whole sentence with the most question-word overlap. Safe but blunt. |
| `span_extract` | **Candidate.** Find that sentence, then narrow to an answer span (entity / year / number), skipping the entity the question already names. |

Scores use the SQuAD convention: normalized exact match, token-overlap F1, and
gold containment. Each prediction scores against its best-matching gold answer.

The harness pins the candidate aggregate as a baseline contract
(`pinned-baseline.json`) and blocks if a future run drops below it, and it
surfaces every per-case regression where the candidate scored worse than the
baseline.

## Why this design

The candidate lifts exact match and token F1 substantially by returning the
answer span instead of the whole sentence, but it regresses on an adversarial
pack where a distractor entity precedes the answer. That trade-off (a change
that improves the aggregate while silently degrading specific cases) is exactly
what a regression-tracking harness exists to make visible.

The system-under-test is deterministic on purpose: anyone can reproduce the
published numbers with no credentials, no network, and no cost. The harness is
model-agnostic; a live-LLM target would implement the same interface and is an
optional extension, never required by this benchmark.

## Contents

- `cases.jsonl` — 38 labelled cases. 26 standard (who / where / when / how-many
  / what) and 12 adversarial, tagged in each row.
- `pinned-baseline.json` — the pinned candidate-aggregate contract.
- `results/latest-report.md` — human-readable report of the most recent run.
- `results/archive/<run_id>.json` — every published run, by id.

## Provenance and license

Every passage is original prose written for this benchmark, describing
well-known public-domain facts (geography, science, history). No third-party
dataset text is included, so there are no upstream licensing constraints. The
fixture is dedicated to the public domain (CC0).

## Reproduce

```bash
git clone https://github.com/IgnazioDS/evalops-workbench
cd evalops-workbench && pip install -e .
python -m evalops_workbench.benchmark_runner
```

The run writes `api/_benchmark_latest.json` (served at `/api/benchmark-latest`),
appends `api/_benchmark_history.json`, and refreshes the report above.
