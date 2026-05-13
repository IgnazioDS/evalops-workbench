# EvalOps Workbench

> A local-first evaluation harness for prompts, tools, and agents. Regression tracking and experiment history. Evaluation as a contract the build is supposed to satisfy — not a dashboard you check after the fact.

[**Live dashboard →**](https://evalops-workbench.eleventh.dev) · Stage: Prototype · Track: LLM · Category: Developer Tool

---

## Status: prototype-state

**This repository now ships a real local prototype harness.** The Python package can load an evaluation dataset, run a named variant, score each case with a typed rubric, persist the run in DuckDB, emit per-case JSONL artifacts, inspect historical runs, export comparison reports, and enforce a regression gate. The public dashboard now includes a dedicated prototype route that demonstrates that eval loop end to end.

For an example of what one of these projects looks like once graduated to production, see [NexusRAG](https://github.com/IgnazioDS/NexusRAG) — same operator, same engineering bar, fully shipped.

---

## What this project is

Most evaluation tooling treats evaluation as instrumentation: run a few benchmarks at release, look at the dashboards. The framing is upside-down. Evaluation is not the thing you measure after building; it is the contract the build is supposed to satisfy.

EvalOps Workbench is the harness for teams that ship prompt changes the way good engineering teams ship database migrations — versioned, regression-tested, blockable.

## Architectural thesis

- **Local-first.** Experiments run on a developer's machine, not in a hosted dashboard with API rate limits. The eval loop has to be faster than the dev loop, or the engineer stops using it.
- **Regression tracking is a deploy gate.** A regression dashboard nobody reads does not prevent regressions. The contract is: deploy blocks if quality drops below the pinned baseline.
- **Experiment history as a versioned ledger.** Not a CSV someone forgot to commit. Every run, every prompt revision, every model upgrade is reconstructable from the ledger.
- **Pinned per-combination baselines.** Each `(prompt × model × retrieval-depth)` triple has its own contract. A model upgrade does not silently rebase every other dimension.

## Failure modes this addresses

| Failure mode | What surfaces in production |
|---|---|
| Silent prompt regression | A prompt change improves one test case and silently degrades twelve others. The degradation surfaces three weeks later. |
| Evaluation drift | The harness tests yesterday's quality contract while the spec moved forward. The gate scores against stale truth. |
| Demo-grade evaluation | 80% of test cases are happy paths. Production hits adversarial inputs the harness never covered. |
| Black-box pass/fail | The CI says fail, the engineer cannot tell which case regressed. Without per-case traceability, the fix is guess-driven. |

## Positioning

- **Category claimed**: local-first evaluation harness for AI engineers who treat evaluation as a deliverable artifact.
- **Category refused**: hosted eval-as-a-service, "AI testing platform" SaaS, generic LLM observability dashboards, "AI testing made easy" registers.
- **Closest comparisons**:
  - **LangSmith** — hosted eval + observability. EvalOps is the local-first complement, not a replacement.
  - **Promptfoo / DeepEval** — open-source eval frameworks EvalOps is conceptually adjacent to, but adds explicit regression-tracking discipline + experiment-history ledger.

---

## Working MVP

The local slice that ships in this repo today:

- Load JSON evaluation datasets with typed case IDs, expected outcomes, and rubric contracts
- Resolve named prompt variants from `examples/variants/`
- Score each case deterministically with required/forbidden keyword rubrics
- Persist run summaries and case-level results in DuckDB
- Emit JSONL artifacts for every run under `.evalops/runs/`
- Compare two runs and surface regressions vs improvements
- Inspect a run case-by-case with score traces and missing-keyword notes
- Export markdown or JSON reports for review threads and CI artifacts
- Enforce zero-regression gates with explicit threshold flags

**Current product stack**: Python · Argparse CLI · DuckDB ledger · JSONL artifacts · Next.js dashboard.

---

## What ships right now

This is what is in the repo today, audited honestly.

### 1. Showcase dashboard (`/`)

Next.js 14 App Router app at the live URL above. Six routes:

| path | what it shows |
|---|---|
| `/` | Overview — pitch banner, live `/api/stats` Tier-B counters, system status, audience + stack |
| `/prototype` | Real eval story — baseline vs candidate metrics, case deltas, gate verdict, CLI flow |
| `/telemetry` | Polling telemetry consumer — full metric grid, raw JSON, 30s visibility-aware polling, contract docs |
| `/capabilities` | MVP scope, problem statement, why-now, audience, stack — read from `project.json` |
| `/roadmap` | Three-phase timeline (showcase → MVP build → Tier-A graduation) |
| `/settings` | Theme + project metadata |

### 2. Telemetry endpoint (`api/stats.py`)

Stdlib-only Vercel Python serverless function. Reports honest GitHub-derived signals — commits, stars, last commit, primary language, lines of code. Never simulated workload metrics. Contract documented in [TELEMETRY_SCHEMA.md](https://github.com/IgnazioDS/IgnazioDS/blob/main/TELEMETRY_SCHEMA.md).

### 3. Python evaluation harness (`src/evalops_workbench/`)

Argparse-based CLI with real run history and regression comparison:

```bash
evalops-workbench summary
evalops-workbench capabilities
evalops-workbench roadmap
evalops-workbench run --dataset examples/support_qa.json --variant prompt_v2
evalops-workbench compare --base run_001 --candidate run_002
evalops-workbench show --run run_002
evalops-workbench gate --base run_001 --candidate run_002
evalops-workbench runs
```

The harness reads typed dataset rows, resolves a variant spec, evaluates each case, writes case-level JSONL output, persists the run ledger to DuckDB, and can save markdown or JSON reports for a comparison or gate run. `project.json` remains the shared metadata registry for both the dashboard and the CLI.

### 4. Example evaluation pack (`examples/`)

The repo now includes a concrete starter pack for local evaluation:

- `examples/support_qa.json` — four support QA cases with expected outcomes and rubric thresholds
- `examples/support_qa.csv` — the same dataset in flat-file form for teams that prefer spreadsheet-style editing
- `examples/variants/prompt_v1.json` — baseline variant with missing operational detail
- `examples/variants/prompt_v2.json` — improved variant that preserves concrete policy facts

This gives evaluators a real clone-to-run path instead of a conceptual roadmap.

### 5. Quality + telemetry pipeline

Vercel deploy with `/api/stats` warming a 5-minute cache, GitHub Actions for Python harness tests plus Next.js type-check and vitest, and build-time `_telemetry_static.json` artifact computed by `scripts/compute_telemetry_static.py`.

---

## Architecture

```
┌──── current repo state (prototype-tier) ───────────────────────────┐
│                                                                    │
│  Next.js dashboard ──▶  /api/stats (stdlib Python)  ──▶  GitHub   │
│  (5 routes)              cached 5 min                      API     │
│       │                                                            │
│       └─▶  reads ──▶  project.json  ◀── reads ── Python CLI       │
│                       (typed registry)                             │
│                                  │                                 │
│                                  └─▶ Eval engine ─▶ DuckDB + JSONL │
└────────────────────────────────────────────────────────────────────┘
```

The current dashboard is the public-facing shell. The Python CLI now includes a real harness slice: dataset loading, rubric scoring, run storage, historical inspection, report export, and regression gating. The next graduation step is richer scorer types and live integrations, not basic eval mechanics.

---

## Quickstart

### Run the showcase dashboard

```bash
git clone https://github.com/IgnazioDS/evalops-workbench.git
cd evalops-workbench
npm install
npm run dev          # http://localhost:3000
```

### Run the Python evaluation harness

```bash
cd evalops-workbench
python -m venv .venv
source .venv/bin/activate
python -m pip install -e .
evalops-workbench summary
evalops-workbench run --dataset examples/support_qa.json --variant prompt_v2
evalops-workbench compare --base run_001 --candidate run_002
evalops-workbench show --run run_002
evalops-workbench gate --base run_001 --candidate run_002
evalops-workbench runs
```

If you prefer `uv`, the same flow works with:

```bash
uv run evalops-workbench run --dataset examples/support_qa.json --variant prompt_v2
uv run evalops-workbench compare --base run_001 --candidate run_002
uv run evalops-workbench gate --base run_001 --candidate run_002
```

### Test + type-check

```bash
npm run lint
npm run type-check
npm test                    # vitest suite
python -m unittest discover -s tests -p 'test_*.py'
```

---

## Dashboard stack

Next.js 14 App Router · TypeScript strict · Tailwind 3 · Geist Sans + Mono · Radix UI · cmdk (⌘K) · sonner · next-themes · framer-motion · vitest + Testing Library.

### Keyboard shortcuts

| keys | action |
|---|---|
| ⌘K / Ctrl+K | Command palette |
| G then O / P / T / C / R | Overview / Prototype / Telemetry / Capabilities / Roadmap |

---

## More context

- **Operator's hub**: [eleventh.dev](https://eleventh.dev) — the public site this dashboard's telemetry feeds into
- **Reference shipped project**: [NexusRAG](https://github.com/IgnazioDS/NexusRAG) — production-grade multi-tenant RAG agent platform, same operator
- **Telemetry contract**: [TELEMETRY_SCHEMA.md](https://github.com/IgnazioDS/IgnazioDS/blob/main/TELEMETRY_SCHEMA.md) — what the Tier-B counters mean and what they don't
- **Status of this project**: prototype-tier. The local harness and regression gate ship today; the next step is richer scorer types, more datasets, and stronger live integrations.

---

## License

MIT — see [LICENSE](./LICENSE).
