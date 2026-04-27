"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  ExternalLink,
  GitCommit,
  Github,
  Lightbulb,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { fetchPublicStats, type PublicStats } from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";
import { StatCard } from "@/components/dashboard/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkline } from "@/components/ui/sparkline";
import { PROJECT } from "@/lib/project";
import { formatRelative } from "@/lib/utils";

/**
 * Build a deterministic 10-point shape derived from the live value, so
 * StatCard sparklines convey velocity without claiming a measured history
 * the showcase tier doesn't have.
 */
function shapeFromValue(target: number, points = 10): number[] {
  if (target <= 0) return Array(points).fill(0);
  const result: number[] = [];
  for (let i = 0; i < points; i++) {
    const ratio = i / (points - 1);
    const eased = ratio * ratio;
    const wobble = Math.sin(i + target) * 0.06;
    result.push(target * (eased + wobble + 0.1));
  }
  return result;
}

export default function OverviewPage() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicStats()
      .then(setStats)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const commitsTotal = (stats?.metrics.commits_total as number | undefined) ?? 0;
  const commits30d = (stats?.metrics.commits_30d as number | undefined) ?? 0;
  const stars = (stats?.metrics.repo_stars as number | undefined) ?? 0;
  const loc = (stats?.metrics.lines_of_code as number | undefined) ?? 0;

  return (
    <>
      <TopBar
        title={PROJECT.name}
        description={PROJECT.summary}
        actions={
          <Button asChild size="sm" variant="outline">
            <a href="/telemetry">
              Open telemetry
              <ExternalLink />
            </a>
          </Button>
        }
      />
      <div className="dot-grid grid-fade flex-1 overflow-y-auto">
        <div className="page-enter mx-auto max-w-6xl space-y-5 p-6">
          {/* Pitch banner */}
          <Card className="overflow-hidden">
            <CardContent className="grid gap-4 p-6 lg:grid-cols-[1fr,auto] lg:items-center">
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="brand">{PROJECT.stage}</Badge>
                  <Badge variant="outline">{PROJECT.category}</Badge>
                  <Badge variant="outline">{PROJECT.track}</Badge>
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  {PROJECT.summary}
                </h2>
                <p className="text-sm text-foreground-muted leading-relaxed">
                  <span className="text-foreground">Problem.</span> {PROJECT.problem}{" "}
                  <span className="text-foreground">Why now.</span> {PROJECT.why_now}
                </p>
              </div>
              <div className="flex flex-row gap-2 lg:flex-col">
                <Button asChild size="sm" variant="primary">
                  <a href="/capabilities">
                    See capabilities
                    <ArrowRight />
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a
                    href={PROJECT.github_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Github />
                    GitHub
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stat row — wired to real /api/stats Tier-B values */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Commits · total"
              value={commitsTotal}
              subtitle="GitHub history"
              icon={GitCommit}
              sparkData={shapeFromValue(commitsTotal)}
              loading={loading}
            />
            <StatCard
              title="Commits · 30d"
              value={commits30d}
              subtitle="Trailing 30 days"
              icon={TrendingUp}
              sparkData={shapeFromValue(commits30d)}
              loading={loading}
            />
            <StatCard
              title="Repo stars"
              value={stars}
              subtitle="GitHub"
              icon={Star}
              sparkData={shapeFromValue(stars)}
              loading={loading}
            />
            <StatCard
              title="Lines of code"
              value={loc}
              subtitle={
                stats?.metrics.primary_language
                  ? `Mostly ${stats.metrics.primary_language}`
                  : "All sources"
              }
              icon={Lightbulb}
              sparkData={shapeFromValue(loc)}
              loading={loading}
            />
          </div>

          {/* Status row */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-border-subtle py-3">
              <CardTitle>System status</CardTitle>
              <Badge
                variant={
                  stats?.status === "operational" ? "success" : "warning"
                }
              >
                <StatusDot
                  tone={
                    stats?.status === "operational" ? "success" : "warning"
                  }
                  pulse={stats?.status === "operational"}
                  size="sm"
                />
                {stats?.status ?? "unknown"}
              </Badge>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 py-4 sm:grid-cols-4">
              <StatusCell
                label="Mode"
                value={stats?.mode ?? "showcase"}
                hint="Tier B — see schema"
              />
              <StatusCell
                label="Last commit"
                value={formatRelative(stats?.last_commit_at)}
                hint={stats?.last_commit_at ?? "never"}
              />
              <StatusCell
                label="Last deploy"
                value={formatRelative(stats?.last_deployed_at)}
                hint={stats?.last_deployed_at ?? "never"}
              />
              <StatusCell
                label="Schema"
                value={`v${stats?.schema_version ?? 1}`}
                hint="public contract"
              />
            </CardContent>
          </Card>

          {/* Users + audience */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-brand" />
                  Built for
                </CardTitle>
                <CardDescription>{PROJECT.users}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xs font-medium uppercase tracking-wider text-foreground-faint mb-2">
                  Stack
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {PROJECT.stack.map((s) => (
                    <Badge key={s} variant="muted">
                      {s}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>What ships first</CardTitle>
                <CardDescription>The MVP scope this project commits to.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {PROJECT.mvp.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-sm text-foreground-muted"
                    >
                      <span className="mt-1.5 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function StatusCell({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-2xs font-medium uppercase tracking-wider text-foreground-faint">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 text-2xs text-foreground-subtle truncate">
          {hint}
        </p>
      )}
    </div>
  );
}
