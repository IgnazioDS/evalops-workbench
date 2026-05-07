# EvalOps Workbench

> A local-first evaluation harness for prompts, tools, and agents. Regression tracking and experiment history. Evaluation as a contract the build is supposed to satisfy — not a dashboard you check after the fact.

[**Live dashboard →**](https://evalops-workbench.eleventh.dev) · Stage: Researching · Track: LLM · Category: Developer Tool

---

## Status: showcase-state

**This repository is in showcase-state.** The MVP harness — dataset loading, run-comparison engine, regression-tracking dashboard, deploy gate — is not yet in this repo. What ships now is a public dashboard, a stdlib-only telemetry endpoint, and a Python CLI scaffold that exposes the project contract. See [What ships right now](#what-ships-right-now) for the audit.

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

## Planned MVP

The system the dashboard will graduate to:

- Load datasets from JSON or CSV
- Run prompt or agent variants with deterministic seeding
- Score outputs with rubric functions (typed, versioned)
- Compare runs and export regressions
- Block deploy on regression vs pinned baseline

**Planned product stack**: Python · Typer (CLI) · DuckDB (experiment ledger) · OpenTelemetry (run instrumentation).

---

## What ships right now

This is what is in the repo today, audited honestly.

### 1. Showcase dashboard (`/`)

Next.js 14 App Router app at the live URL above. Five routes:

| path | what it shows |
|---|---|
| `/` | Overview — pitch banner, live `/api/stats` Tier-B counters, system status, audience + stack |
| `/telemetry` | Polling telemetry consumer — full metric grid, raw JSON, 30s visibility-aware polling, contract docs |
| `/capabilities` | MVP scope, problem statement, why-now, audience, stack — read from `project.json` |
| `/roadmap` | Three-phase timeline (showcase → MVP build → Tier-A graduation) |
| `/settings` | Theme + project metadata |

### 2. Telemetry endpoint (`api/stats.py`)

Stdlib-only Vercel Python serverless function. Reports honest GitHub-derived signals — commits, stars, last commit, primary language, lines of code. Never simulated workload metrics. Contract documented in [TELEMETRY_SCHEMA.md](https://github.com/IgnazioDS/IgnazioDS/blob/main/TELEMETRY_SCHEMA.md).

### 3. Python CLI scaffold (`src/evalops_workbench/`)

Argparse-based CLI exposing the project contract. Currently three subcommands:

```
evalops-workbench summary       # name, summary, problem, users, stage, track
evalops-workbench capabilities  # planned MVP capabilities
evalops-workbench roadmap       # docs/roadmap.md
```

The CLI reads `project.json` — a single typed registry that drives both the dashboard's `/capabilities` route and the CLI. When MVP work begins, the harness primitives layer onto this scaffold.

### 4. Deploy + telemetry pipeline

Vercel deploy with `/api/stats` warming a 5-minute cache, GitHub Actions for the type-check + vitest gate, build-time `_telemetry_static.json` artifact computed by `scripts/compute_telemetry_static.py`.

---

## Architecture (graduation path)

```
┌──── current repo state (showcase-tier) ────────────────────────────┐
│                                                                    │
│  Next.js dashboard ──▶  /api/stats (stdlib Python)  ──▶  GitHub   │
│  (5 routes)              cached 5 min                      API     │
│       │                                                            │
│       └─▶  reads ──▶  project.json  ◀── reads ── Python CLI       │
│                       (typed registry)                             │
└────────────────────────────────────────────────────────────────────┘

                              │  graduates to
                              ▼

┌──── planned MVP (Tier-A) ──────────────────────────────────────────┐
│                                                                    │
│  Typer CLI ──▶  Eval engine  ──▶  Rubric scorers  ──▶  DuckDB     │
│       │              │                                  ledger     │
│       │              ▼                                             │
│       │         OTEL spans  ────▶  Local trace viewer              │
│       │                                                            │
│       └──▶  Regression diff  ──▶  Deploy gate  ──▶  exit non-zero │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

The current dashboard is the public-facing shell. The Python CLI is the spine the MVP harness will extend. `project.json` stays as the single source of truth for what the system claims to be.

---

## Quickstart

### Run the showcase dashboard

```bash
git clone https://github.com/IgnazioDS/evalops-workbench.git
cd evalops-workbench
npm install
npm run dev          # http://localhost:3000
```

### Run the Python CLI scaffold

```bash
cd evalops-workbench
python -m evalops_workbench.cli summary
python -m evalops_workbench.cli capabilities
python -m evalops_workbench.cli roadmap
```

### Test + type-check

```bash
npm run lint
npm run type-check
npm test                    # vitest suite
python -m pytest tests/     # python tests
```

---

## Dashboard stack

Next.js 14 App Router · TypeScript strict · Tailwind 3 · Geist Sans + Mono · Radix UI · cmdk (⌘K) · sonner · next-themes · framer-motion · vitest + Testing Library.

### Keyboard shortcuts

| keys | action |
|---|---|
| ⌘K / Ctrl+K | Command palette |
| G then O / T / C / R | Overview / Telemetry / Capabilities / Roadmap |

---

## More context

- **Operator's hub**: [eleventh.dev](https://eleventh.dev) — the public site this dashboard's telemetry feeds into
- **Reference shipped project**: [NexusRAG](https://github.com/IgnazioDS/NexusRAG) — production-grade multi-tenant RAG agent platform, same operator
- **Telemetry contract**: [TELEMETRY_SCHEMA.md](https://github.com/IgnazioDS/IgnazioDS/blob/main/TELEMETRY_SCHEMA.md) — what the Tier-B counters mean and what they don't
- **Status of this project**: showcase-tier. The harness graduates when the regression-tracking ledger and the deploy gate ship.

---

## License

MIT — see [LICENSE](./LICENSE).
