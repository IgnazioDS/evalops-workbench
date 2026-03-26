# Architecture Notes

## Product Shape

EvalOps Workbench starts as a focused Python service or CLI with a clean domain boundary. The local interface is intentionally small so the core logic can evolve into an API, worker, or scheduled job without rework.

## Design Priorities

- Keep the product contract explicit and testable.
- Avoid framework lock-in early.
- Reserve room for persistence, telemetry, and deployment concerns.
- Treat generated output as an artifact that can be audited.

## Current Modules

- `models.py` defines the typed project metadata.
- `catalog.py` loads the shipped product spec.
- `cli.py` exposes summary, capabilities, and roadmap commands.
