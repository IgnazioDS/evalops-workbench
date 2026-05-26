// Slim API surface for the dashboard.
// Two public, unauthenticated endpoints are real on this deploy:
//   /api/stats            — Tier-A telemetry (TELEMETRY_SCHEMA.md)
//   /api/benchmark-latest — the latest published benchmark run

async function publicFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(`Public API ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/** Tier-A telemetry response — see TELEMETRY_SCHEMA.md. */
export interface PublicStats {
  system: string;
  mode?: "live" | "showcase";
  status: "operational" | "degraded" | "down";
  last_deployed_at: string | null;
  last_active_at?: string | null;
  last_commit_at?: string | null;
  metrics: {
    eval_runs_total?: number;
    eval_runs_24h?: number;
    last_pass_rate?: number;
    rolling_pass_rate_7d?: number;
    regressions_caught_30d?: number;
    experiments_tracked?: number;
    [key: string]: number | string | undefined;
  };
  schema_version: number;
  generated_at: string;
}

export function fetchPublicStats(): Promise<PublicStats> {
  return publicFetch<PublicStats>("/api/stats");
}

/** One strategy's aggregate scores in a benchmark run. */
export interface BenchmarkVariant {
  name: string;
  exact_match: number;
  token_f1: number;
  contains_gold: number;
}

/** A single per-case regression surfaced by the run. */
export interface BenchmarkRegression {
  case_id: string;
  metric: string;
  baseline: number;
  candidate: number;
  delta: number;
  reason: string;
  tags: string[];
}

export interface BenchmarkMetrics {
  n_cases: number;
  baseline_variant: string;
  candidate_variant: string;
  exact_match: number;
  token_f1: number;
  contains_gold: number;
  improvement_exact_match: number;
  improvement_token_f1: number;
  regressions: number;
  pass_rate: number;
  gate_verdict: string;
}

/** /api/benchmark-latest response — see the benchmark-latest spec in TELEMETRY_SCHEMA.md. */
export interface PublicBenchmark {
  system: string;
  benchmark_type: string;
  status?: string;
  run_id: string | null;
  fixture?: string;
  metrics: BenchmarkMetrics | null;
  variants?: BenchmarkVariant[];
  regressions?: BenchmarkRegression[];
  gate?: {
    passed: boolean;
    metric: string;
    pinned: number | null;
    observed: number;
    reasons: string[];
  };
  artifact_urls?: { report: string; fixture: string; run: string };
  schema_version: number;
  generated_at: string;
  previous_run?: {
    run_id: string | null;
    generated_at: string | null;
    delta: Record<string, number>;
  } | null;
}

export function fetchBenchmarkLatest(): Promise<PublicBenchmark> {
  return publicFetch<PublicBenchmark>("/api/benchmark-latest");
}
