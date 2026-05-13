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
- `cli.py` exposes summary, run, compare, runs, and roadmap commands.
- `workbench.py` implements dataset loading, variant resolution, scoring, JSONL artifacts, and DuckDB persistence.

## Runtime Flow

1. `evalops-workbench run` loads a JSON dataset with expected behavior and rubric constraints.
2. A named variant is resolved from `examples/variants/` or from a direct JSON file path.
3. Each case is scored deterministically against required and forbidden keywords.
4. Case-level artifacts are written to `.evalops/runs/<run_id>.jsonl`.
5. Run summaries and result rows are persisted to `.evalops/evalops.duckdb`.
6. `evalops-workbench compare` reads two historical runs and reports regressions vs improvements.

## Next Graduation Steps

- Add richer scorer types beyond keyword contracts.
- Support CSV ingestion alongside JSON.
- Add CI-oriented exit codes for deploy gating.
- Emit structured traces so regressions are explainable, not just visible.
