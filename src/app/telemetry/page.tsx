"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Code2,
  GitCommit,
  Layers,
  RefreshCw,
  Star,
} from "lucide-react";
import { fetchPublicStats, type PublicStats } from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";
import { CodeBlock } from "@/components/ui/code-block";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePolling } from "@/lib/hooks";
import { PROJECT } from "@/lib/project";
import {
  formatDate,
  formatNumber,
  formatRelative,
} from "@/lib/utils";

const POLL_INTERVAL_MS = 30_000;

export default function TelemetryPage() {
  const { data: stats, loading, error, refetch } = usePolling<PublicStats>(
    fetchPublicStats,
    POLL_INTERVAL_MS,
  );
  const [tab, setTab] = useState("overview");

  return (
    <>
      <TopBar
        title="Telemetry"
        description="Live readout of the public /api/stats contract"
        actions={
          <Button size="sm" variant="outline" onClick={refetch}>
            <RefreshCw />
            Refresh
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <div className="page-enter mx-auto max-w-6xl space-y-5 p-6">
          {/* Header status */}
          <Card>
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <StatusDot
                  tone={
                    stats?.status === "operational"
                      ? "success"
                      : stats?.status === "degraded"
                      ? "warning"
                      : "muted"
                  }
                  pulse={stats?.status === "operational"}
                  size="lg"
                />
                <div>
                  <p className="text-sm font-semibold text-foreground tracking-tight">
                    {stats?.system ?? PROJECT.system_slug}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {stats
                      ? `${stats.status} · schema v${stats.schema_version}`
                      : "loading…"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={stats?.mode === "live" ? "brand" : "muted"}>
                  {stats?.mode ?? "showcase"}
                </Badge>
                <Badge variant="outline">
                  generated {formatRelative(stats?.generated_at)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {error && !stats && (
            <Card className="border-danger/30 bg-danger/5">
              <CardContent className="flex items-start gap-3 p-4">
                <StatusDot tone="danger" />
                <div>
                  <p className="text-sm font-medium text-danger">
                    Couldn&apos;t reach the telemetry endpoint
                  </p>
                  <p className="mt-1 text-2xs text-foreground-muted">
                    {error.message}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tier-B metric grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile
              label="Commits · total"
              value={
                stats
                  ? formatNumber(stats.metrics.commits_total as number)
                  : "—"
              }
              icon={GitCommit}
              loading={loading}
            />
            <MetricTile
              label="Commits · 30d"
              value={
                stats ? formatNumber(stats.metrics.commits_30d as number) : "—"
              }
              icon={GitCommit}
              loading={loading}
            />
            <MetricTile
              label="Lines of code"
              value={
                stats
                  ? formatNumber(stats.metrics.lines_of_code as number)
                  : "—"
              }
              icon={Code2}
              loading={loading}
            />
            <MetricTile
              label="Repo stars"
              value={
                stats ? formatNumber(stats.metrics.repo_stars as number) : "—"
              }
              icon={Star}
              loading={loading}
            />
            <MetricTile
              label="Primary language"
              value={
                (stats?.metrics.primary_language as string | undefined) ?? "—"
              }
              icon={Layers}
              loading={loading}
            />
            <MetricTile
              label="Last commit"
              value={formatRelative(stats?.last_commit_at)}
              icon={CheckCircle2}
              loading={loading}
            />
            <MetricTile
              label="Last deploy"
              value={formatRelative(stats?.last_deployed_at)}
              icon={CheckCircle2}
              loading={loading}
            />
            <MetricTile
              label="Generated at"
              value={formatRelative(stats?.generated_at)}
              icon={CheckCircle2}
              loading={loading}
            />
          </div>

          {/* Tabbed details */}
          <Card>
            <CardContent className="p-5">
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="contract">Contract</TabsTrigger>
                  <TabsTrigger value="raw">Raw response</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <DetailRow
                      label="System slug"
                      value={stats?.system ?? PROJECT.system_slug}
                      mono
                    />
                    <DetailRow
                      label="Mode"
                      value={stats?.mode ?? "showcase"}
                    />
                    <DetailRow
                      label="Schema version"
                      value={`v${stats?.schema_version ?? 1}`}
                    />
                    <DetailRow
                      label="Status"
                      value={stats?.status ?? "—"}
                      tone={
                        stats?.status === "operational"
                          ? "success"
                          : "warning"
                      }
                    />
                    <DetailRow
                      label="Last commit"
                      value={formatDate(stats?.last_commit_at)}
                      hint={stats?.last_commit_at ?? undefined}
                    />
                    <DetailRow
                      label="Last deployed"
                      value={formatDate(stats?.last_deployed_at)}
                      hint={stats?.last_deployed_at ?? undefined}
                    />
                    <DetailRow
                      label="Generated at"
                      value={formatDate(stats?.generated_at)}
                      hint={stats?.generated_at}
                    />
                    <DetailRow
                      label="Polling"
                      value={`${POLL_INTERVAL_MS / 1000}s`}
                      hint="visibility-aware"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="contract">
                  <div className="space-y-3 text-sm text-foreground-muted">
                    <p>
                      This endpoint runs in{" "}
                      <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-xs">
                        mode: &quot;showcase&quot;
                      </code>{" "}
                      per the public schema at{" "}
                      <a
                        className="text-brand underline-offset-2 hover:underline"
                        href="https://github.com/IgnazioDS/IgnazioDS/blob/main/TELEMETRY_SCHEMA.md"
                        target="_blank"
                        rel="noreferrer"
                      >
                        TELEMETRY_SCHEMA.md
                      </a>
                      . Counters are sourced from the GitHub REST API
                      (commits, language, stars) plus a build-time line-of-code
                      snapshot, behind a 5-minute module-scope cache.
                    </p>
                    <p>
                      The endpoint never returns 5xx — GitHub failures degrade
                      to{" "}
                      <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-xs">
                        status: &quot;degraded&quot;
                      </code>{" "}
                      with the last cached response (or zeros) and a
                      contract-valid envelope.
                    </p>
                    <CodeBlock language="bash">
                      {`curl -i https://${PROJECT.slug}.vercel.app/api/stats`}
                    </CodeBlock>
                  </div>
                </TabsContent>

                <TabsContent value="raw">
                  <CodeBlock language="json">
                    {stats
                      ? JSON.stringify(stats, null, 2)
                      : "Loading current response…"}
                  </CodeBlock>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function MetricTile({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string;
  icon: typeof GitCommit;
  loading: boolean;
}) {
  return (
    <Card>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <p className="text-2xs font-medium uppercase tracking-wider text-foreground-faint">
            {label}
          </p>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-2 text-foreground-muted">
            <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
          </div>
        </div>
        {loading ? (
          <Skeleton className="mt-2 h-7 w-24" />
        ) : (
          <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
            {value}
          </p>
        )}
      </div>
    </Card>
  );
}

function DetailRow({
  label,
  value,
  hint,
  mono,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
  tone?: "success" | "warning" | "danger";
}) {
  return (
    <div className="flex flex-col rounded-md border border-border-subtle bg-surface-2 px-3 py-2">
      <p className="text-2xs uppercase tracking-wider text-foreground-faint">
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-medium ${
          mono ? "font-mono text-foreground-muted" : "text-foreground"
        } ${
          tone === "success"
            ? "text-success"
            : tone === "warning"
            ? "text-warning"
            : tone === "danger"
            ? "text-danger"
            : ""
        }`}
      >
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
