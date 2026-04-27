import { Activity, Compass, Github, Map as MapIcon, Rocket } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PROJECT } from "@/lib/project";

export const metadata = { title: "Roadmap" };

interface Phase {
  label: string;
  status: "now" | "next" | "later";
  description: string;
  items: string[];
}

const PHASES: Phase[] = [
  {
    label: "Now — Showcase deploy",
    status: "now",
    description:
      "The Vercel deploy is a public landing page with a public telemetry endpoint. The API skeleton is documented; production workload is not yet routed through it.",
    items: [
      "Static landing page is live at vercel.app",
      "Public /api/stats Tier-B telemetry endpoint",
      "GitHub-derived metrics behind a 5-minute cache",
      "TELEMETRY_SCHEMA.md as the public contract",
    ],
  },
  {
    label: "Next — MVP build",
    status: "next",
    description: `Implement the four MVP commitments. After this phase the system is promoted from "showcase" to "live" and the telemetry contract upgrades to Tier-A.`,
    items: PROJECT.mvp,
  },
  {
    label: "Later — Production graduation",
    status: "later",
    description:
      "Once the MVP runs real workload, the dashboard upgrades to Tier-A telemetry with workload counters (per-system metric set), middleware-recorded query/run logs, and Postgres-persisted aggregations.",
    items: [
      "Tier-A live telemetry replaces Tier-B GitHub-derived metrics",
      "Postgres persistence for workload counters",
      "Middleware-driven recording with privacy invariants",
      "Audit trail surfaced in the dashboard",
    ],
  },
];

const TONE: Record<Phase["status"], "brand" | "info" | "muted"> = {
  now: "brand",
  next: "info",
  later: "muted",
};

export default function RoadmapPage() {
  return (
    <>
      <TopBar
        title="Roadmap"
        description={`Stage and plan for ${PROJECT.name}`}
        actions={
          <Button asChild size="sm" variant="outline">
            <a href={PROJECT.github_url} target="_blank" rel="noreferrer">
              <Github />
              GitHub
            </a>
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="page-enter mx-auto max-w-4xl space-y-5 p-6">
          {/* Stage card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Compass className="h-3.5 w-3.5 text-brand" />
                  Current stage
                </CardTitle>
                <CardDescription className="mt-1">
                  Where this project sits today.
                </CardDescription>
              </div>
              <Badge variant="brand" className="!text-xs">
                {PROJECT.stage}
              </Badge>
            </CardHeader>
          </Card>

          {/* Phases */}
          <div className="relative space-y-4">
            {PHASES.map((phase, i) => (
              <div key={phase.label} className="relative">
                {/* Vertical timeline connector */}
                {i < PHASES.length - 1 && (
                  <div
                    aria-hidden
                    className="absolute left-[14px] top-12 w-px h-[calc(100%+1rem-2.5rem)] bg-border-subtle"
                  />
                )}
                <div className="flex gap-3">
                  <div className="flex shrink-0 flex-col items-center">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                        phase.status === "now"
                          ? "border-brand/40 bg-brand/15 text-brand"
                          : phase.status === "next"
                          ? "border-info/30 bg-info/10 text-info"
                          : "border-border bg-surface-2 text-foreground-faint"
                      }`}
                    >
                      {phase.status === "now" ? (
                        <Activity className="h-3.5 w-3.5" />
                      ) : phase.status === "next" ? (
                        <Rocket className="h-3.5 w-3.5" />
                      ) : (
                        <MapIcon className="h-3.5 w-3.5" />
                      )}
                    </div>
                  </div>
                  <Card className="flex-1">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-md">{phase.label}</CardTitle>
                        <Badge variant={TONE[phase.status]}>
                          {phase.status}
                        </Badge>
                      </div>
                      <CardDescription className="mt-1 leading-relaxed">
                        {phase.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {phase.items.map((item, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2.5 text-sm text-foreground-muted"
                          >
                            <span className="mt-1.5 inline-flex h-1 w-1 shrink-0 rounded-full bg-foreground-faint" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
