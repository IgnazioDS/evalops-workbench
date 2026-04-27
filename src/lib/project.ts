/**
 * Project metadata sourced from `src/evalops_workbench/project.json`.
 * Hardcoded as a TS module so it ships in the static bundle without runtime
 * file-system access.
 */

export interface ProjectSpec {
  slug: string;
  name: string;
  category: string;
  track: string;
  stage: string;
  summary: string;
  problem: string;
  users: string;
  stack: string[];
  why_now: string;
  mvp: string[];
  github_url: string;
  /** Slug returned by the system's `/api/stats` endpoint. */
  system_slug: string;
}

export const PROJECT: ProjectSpec = {
  slug: "evalops-workbench",
  name: "EvalOps Workbench",
  category: "Developer Tool",
  track: "LLM",
  stage: "Researching",
  summary:
    "A local-first evaluation harness for prompts, tools, and agents with regression tracking and experiment history.",
  problem:
    "LLM teams lack a lightweight way to compare prompt and tool changes before shipping.",
  users: "Agent builders, prompt engineers, applied AI teams",
  stack: ["Python", "Typer", "DuckDB", "OpenTelemetry"],
  why_now:
    "Evaluation is moving from optional best practice to baseline engineering hygiene.",
  mvp: [
    "Load datasets from JSON or CSV",
    "Run prompt or agent variants",
    "Score outputs with rubric functions",
    "Compare runs and export regressions",
  ],
  github_url: "https://github.com/IgnazioDS/evalops-workbench",
  system_slug: "evalops",
};
