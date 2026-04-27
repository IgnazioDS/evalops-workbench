# EvalOps Workbench

A local-first evaluation harness for prompts, tools, and agents with regression tracking and experiment history.

## Problem

LLM teams lack a lightweight way to compare prompt and tool changes before shipping.

## Users

Agent builders, prompt engineers, applied AI teams

## Core Capabilities

- Load datasets from JSON or CSV
- Run prompt or agent variants
- Score outputs with rubric functions
- Compare runs and export regressions

## Why This Matters

Evaluation is moving from optional best practice to baseline engineering hygiene.

## Architecture

- `core`: domain logic for evalops workbench.
- `cli`: operator-facing entrypoint for local workflows and smoke checks.
- `docs/`: product notes, roadmap, and architecture decisions.
- `tests/`: baseline regression coverage for the project contract.

## Local Usage

```bash
uv run evalops-workbench summary
uv run evalops-workbench capabilities
uv run evalops-workbench roadmap
```

## Initial Stack Direction

Python, Typer, DuckDB, OpenTelemetry

## Delivery Standard

- Clear product thesis
- Setup that works locally
- Tests for the primary contract
- Documentation for roadmap and architecture
- Space for production integrations in the next iteration

## Showcase

This repository ships with a static Vercel-ready landing page for demos and previews.

```bash
vercel deploy -y
```

The deployed site presents EvalOps Workbench as a standalone product page.

## Production telemetry

This deployment exposes public, aggregate metrics at `/api/stats`. The endpoint
is consumed by the Production Telemetry panel on https://eleventh.dev. The
schema is documented at
https://github.com/IgnazioDS/IgnazioDS/blob/main/TELEMETRY_SCHEMA.md.

This system is in **showcase mode** — the Vercel deploy is a public landing
page, not a system processing production workload. The endpoint exposes real
GitHub-derived metrics about the codebase rather than fabricated activity
counters. Tier-A workload metrics (`eval_runs_total`, `last_pass_rate`,
`regressions_caught_30d`, etc.) are added when the system is promoted from
showcase to production.

Sample response:

```bash
$ curl -i https://evalops-workbench.vercel.app/api/stats
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: public, max-age=30, stale-while-revalidate=60
Access-Control-Allow-Origin: *

{
  "system": "evalops",
  "mode": "showcase",
  "status": "operational",
  "last_deployed_at": "2026-04-27T18:41:57Z",
  "last_commit_at": "2026-04-01T16:54:50Z",
  "metrics": {
    "commits_30d": 1,
    "commits_total": 3,
    "primary_language": "Python",
    "repo_stars": 0,
    "lines_of_code": 1177
  },
  "schema_version": 1,
  "generated_at": "2026-04-27T18:42:18Z"
}
```

The endpoint never returns HTTP 5xx. If GitHub is unreachable, the response
status flips to `"degraded"` and metric values fall back to last known good
(or zero) values, while the JSON contract remains valid.

To regenerate `lines_of_code` before deploying:

```bash
python3 scripts/compute_telemetry_static.py
git add api/_telemetry_static.json
```
