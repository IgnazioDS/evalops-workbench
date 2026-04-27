# Agent Runbook Orchestrator — Showcase Dashboard

Next.js 14 dashboard for the Agent Runbook Orchestrator showcase deploy.
Same Vercel-grade design system as the NexusRAG dashboard, adapted for
showcase tier (no auth, no BFF — only the public `/api/stats` endpoint
is real).

## Stack

- Next.js 14 App Router · TypeScript strict · Tailwind 3 · Geist Sans + Mono
- Radix UI primitives · cmdk (⌘K) · sonner · next-themes · framer-motion
- vitest + Testing Library

## Routes

| path | what it shows |
|---|---|
| `/` | Overview — pitch banner, live `/api/stats` Tier-B counters, system status, audience + stack |
| `/telemetry` | Polling Tier-B telemetry consumer — full metric grid, raw JSON, contract docs, 30s visibility-aware polling |
| `/capabilities` | MVP scope, problem statement, why-now, audience, stack — sourced from `project.json` |
| `/roadmap` | Three-phase timeline (showcase → MVP build → Tier-A graduation) |
| `/settings` | Theme + project metadata |

## Local development

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

## Scripts

| command | what it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run lint` | Next.js ESLint |
| `npm run type-check` | `tsc --noEmit` |
| `npm test` | Run the vitest suite |

## Deployment

Deploys as its own Vercel project pointing at `/frontend` rootDir; the
existing `agent-runbook-orchestrator` Vercel project continues to serve
the static landing page and `/api/stats` Python serverless function.

## Keyboard shortcuts

| keys | action |
|---|---|
| ⌘K / Ctrl+K | Command palette |
| G then O / T / C / R | Overview / Telemetry / Capabilities / Roadmap |
