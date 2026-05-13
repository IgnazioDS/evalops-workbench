# Architecture Notes

## Product Shape

EvalOps Workbench now has a real local harness boundary: dataset ingestion, deterministic rubric scoring, a DuckDB experiment ledger, and JSONL artifacts. The interface is still intentionally small so the same core can evolve into an API, worker, or CI gate without rework.

## Design Priorities

- Keep the product contract explicit and testable.
- Avoid framework lock-in early.
- Reserve room for persistence, telemetry, and deployment concerns.
- Treat generated output as an artifact that can be audited.

## Current Modules

- `models.py` defines the typed project metadata.
- `catalog.py` loads the shipped product spec.
- `cli.py` exposes summary, run, compare, show, gate, runs, and roadmap commands.
- `workbench.py` implements dataset loading, variant resolution, scoring, JSONL artifacts, DuckDB persistence, run inspection, and gate decisions.

## Runtime Flow

1. `evalops-workbench run` loads a JSON dataset with expected behavior and rubric constraints.
2. A named variant is resolved from `examples/variants/` or from a direct JSON file path.
3. Each case is scored deterministically against required and forbidden keywords.
4. Case-level artifacts are written to `.evalops/runs/<run_id>.jsonl`.
5. Run summaries and result rows are persisted to `.evalops/evalops.duckdb`.
6. `evalops-workbench compare` reads two historical runs and reports regressions vs improvements.
7. `evalops-workbench show` inspects one run case-by-case.
8. `evalops-workbench gate` turns the diff into an explicit pass/fail decision for CI.

## Next Graduation Steps

- Add richer scorer types beyond keyword contracts.
- Add structured trace payloads beyond keyword matching.
- Support richer dataset schemas and larger benchmark packs.
- Add baseline pinning and named suites for multiple agent surfaces.
