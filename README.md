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
