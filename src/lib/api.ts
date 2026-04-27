// Slim API surface for the showcase dashboard.
// Only the public /api/stats endpoint is real on showcase deploys; the
// Tier-A BFF endpoints (run, documents, ui/*) don't exist here.

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

/** Tier-B telemetry response — see TELEMETRY_SCHEMA.md. */
export interface PublicStats {
  system: string;
  mode?: "live" | "showcase";
  status: "operational" | "degraded" | "down";
  last_deployed_at: string | null;
  last_commit_at?: string | null;
  metrics: {
    commits_30d?: number;
    commits_total?: number;
    primary_language?: string;
    repo_stars?: number;
    lines_of_code?: number;
    [key: string]: number | string | undefined;
  };
  schema_version: number;
  generated_at: string;
}

export function fetchPublicStats(): Promise<PublicStats> {
  return publicFetch<PublicStats>("/api/stats");
}
