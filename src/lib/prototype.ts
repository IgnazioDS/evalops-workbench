export interface PrototypeCase {
  caseId: string;
  category: string;
  baselineScore: number;
  candidateScore: number;
  delta: number;
  outcome: "regression" | "improvement" | "stable";
  baselineMissing: string[];
  candidateMissing: string[];
  note: string;
}

export interface PrototypeMetric {
  label: string;
  baseline: string;
  candidate: string;
  delta: string;
}

export const PROTOTYPE_METRICS: PrototypeMetric[] = [
  { label: "Average score", baseline: "0.333", candidate: "1.000", delta: "+0.667" },
  { label: "Pass rate", baseline: "0 / 4", candidate: "4 / 4", delta: "+4 cases" },
  { label: "Regressions", baseline: "n/a", candidate: "0", delta: "clean" },
  { label: "Gate verdict", baseline: "blocked", candidate: "pass", delta: "ship" },
];

export const PROTOTYPE_CASES: PrototypeCase[] = [
  {
    caseId: "refund_policy",
    category: "billing",
    baselineScore: 0.667,
    candidateScore: 1,
    delta: 0.333,
    outcome: "improvement",
    baselineMissing: ["support@acme.test"],
    candidateMissing: [],
    note: "Candidate adds the support escalation detail that makes the answer operational.",
  },
  {
    caseId: "sla_enterprise",
    category: "support",
    baselineScore: 0.333,
    candidateScore: 1,
    delta: 0.667,
    outcome: "improvement",
    baselineMissing: ["four-hour", "Slack"],
    candidateMissing: [],
    note: "Baseline is vague. Candidate restores the exact SLA and dedicated escalation channel.",
  },
  {
    caseId: "seat_upgrade",
    category: "self-serve",
    baselineScore: 0.333,
    candidateScore: 1,
    delta: 0.667,
    outcome: "improvement",
    baselineMissing: ["prorated", "billing settings"],
    candidateMissing: [],
    note: "Candidate turns a directional answer into a workflow answer with timing and billing specifics.",
  },
  {
    caseId: "data_residency",
    category: "security",
    baselineScore: 0,
    candidateScore: 1,
    delta: 1,
    outcome: "improvement",
    baselineMissing: ["roadmap", "not generally available"],
    candidateMissing: [],
    note: "Candidate is compliant because it states the current limit, not just the desired future state.",
  },
];

export const PROTOTYPE_COMMANDS = {
  baseline:
    "uv run evalops-workbench run --dataset examples/support_qa.json --variant prompt_v1 --format json",
  candidate:
    "uv run evalops-workbench run --dataset examples/support_qa.json --variant prompt_v2 --format json",
  compare:
    "uv run evalops-workbench compare --base run_001 --candidate run_002 --format markdown --report reports/comparison.md",
  gate:
    "uv run evalops-workbench gate --base run_001 --candidate run_002 --max-regressions 0 --max-score-drop 0 --max-pass-rate-drop 0",
  inspect:
    "uv run evalops-workbench show --run run_002 --limit 4",
};

export const PROTOTYPE_REPORT = `# EvalOps Gate PASS

- Max regressions: \`0\`
- Max score drop: \`0.000\`
- Max pass-rate drop: \`0.000\`

## Comparison

- Base run: \`prompt_v1\`
- Candidate run: \`prompt_v2\`
- Average score delta: \`+0.667\`
- Pass-rate delta: \`+1.000\`
- Regressions: \`0\`
- Improvements: \`4\``;
