"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  ExternalLink,
  FileText,
  FlaskConical,
  GitCompare,
  Github,
  ShieldAlert,
  Target,
  Users,
} from "lucide-react";
import {
  fetchBenchmarkLatest,
  fetchPublicStats,
  type PublicBenchmark,
  type PublicStats,
} from "@/lib/api";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/ui/status-dot";
import { Skeleton } from "@/components/ui/skeleton";
import { PROJECT } from "@/lib/project";
import { formatNumber, formatRelative } from "@/lib/utils";

function pct(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return "—";
  return `${Math.round(value * 100)}%`;
}

function signedPoints(value: number): string {
  const points = Math.round(value * 100);
  return `${points >= 0 ? "+" : ""}${points} pts`;
}

export default function OverviewPage() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [benchmark, setBenchmark] = useState<PublicBenchmark | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([fetchPublicStats(), fetchBenchmarkLatest()])
      .then(([statsResult, benchmarkResult]) => {
        if (statsResult.status === "fulfilled") setStats(statsResult.value);
        if (benchmarkResult.status === "fulfilled") setBenchmark(benchmarkResult.value);
      })
      .finally(() => setLoading(false));
  }, []);

  const metrics = stats?.metrics ?? {};
  const lastPass = metrics.last_pass_rate as number | undefined;
  const rolling = metrics.rolling_pass_rate_7d as number | undefined;
  const regressions = metrics.regressions_caught_30d as number | undefined;
  const runs = metrics.eval_runs_total as number | undefined;
  const experiments = metrics.experiments_tracked as number | undefined;

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
                  <a href={PROJECT.github_url} target="_blank" rel="noreferrer">
                    <Github />
                    GitHub
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tier-A stat row — wired to real /api/stats live values */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              title="Last pass rate"
              value={pct(lastPass)}
              subtitle="Candidate exact match, latest run"
              icon={Target}
              loading={loading}
            />
            <Stat
              title="Pass rate · 7d"
              value={pct(rolling)}
              subtitle="Rolling mean"
              icon={GitCompare}
              loading={loading}
            />
            <Stat
              title="Regressions · 30d"
              value={regressions === undefined ? "—" : formatNumber(regressions)}
              subtitle="Distinct cases caught"
              icon={ShieldAlert}
              loading={loading}
            />
            <Stat
              title="Eval runs"
              value={runs === undefined ? "—" : formatNumber(runs)}
              subtitle={experiments ? `${experiments} variants tracked` : "Recorded runs"}
              icon={FlaskConical}
              loading={loading}
            />
          </div>

          {/* Status row */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-border-subtle py-3">
              <CardTitle>System status</CardTitle>
              <Badge variant={stats?.status === "operational" ? "success" : "warning"}>
                <StatusDot
                  tone={stats?.status === "operational" ? "success" : "warning"}
                  pulse={stats?.status === "operational"}
                  size="sm"
                />
                {stats?.status ?? "unknown"}
              </Badge>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 py-4 sm:grid-cols-4">
              <StatusCell label="Mode" value={stats?.mode ?? "live"} hint="Tier A · live workload" />
              <StatusCell
                label="Last eval run"
                value={formatRelative(stats?.last_active_at)}
                hint={stats?.last_active_at ?? "never"}
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

          {/* Latest benchmark */}
          <BenchmarkCard benchmark={benchmark} loading={loading} />

          {/* Built for + MVP */}
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
                  {PROJECT.stack.map((item) => (
                    <Badge key={item} variant="muted">
                      {item}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>What ships now</CardTitle>
                <CardDescription>The harness capabilities, live in this repo.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {PROJECT.mvp.map((item, index) => (
                    <li
                      key={index}
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

function BenchmarkCard({
  benchmark,
  loading,
}: {
  benchmark: PublicBenchmark | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }
  if (!benchmark || benchmark.status === "pending" || !benchmark.metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Latest benchmark</CardTitle>
          <CardDescription>No run has been published yet.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const metrics = benchmark.metrics;
  const variants = benchmark.variants ?? [];
  const regressions = benchmark.regressions ?? [];
  const urls = benchmark.artifact_urls;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between border-b border-border-subtle py-3">
        <div>
          <CardTitle>Latest benchmark</CardTitle>
          <CardDescription>
            {benchmark.fixture} · {metrics.n_cases} cases · generated{" "}
            {formatRelative(benchmark.generated_at)}
          </CardDescription>
        </div>
        <Badge variant={metrics.gate_verdict === "pass" ? "success" : "warning"}>
          gate {metrics.gate_verdict}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4 py-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-2xs uppercase tracking-wider text-foreground-faint">
                <th className="py-1.5 text-left font-medium">Variant</th>
                <th className="py-1.5 text-right font-medium">Exact match</th>
                <th className="py-1.5 text-right font-medium">Token F1</th>
                <th className="py-1.5 text-right font-medium">Contains gold</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {variants.map((variant) => {
                const role =
                  variant.name === metrics.candidate_variant
                    ? "candidate"
                    : variant.name === metrics.baseline_variant
                    ? "baseline"
                    : "";
                return (
                  <tr key={variant.name} className="border-t border-border-subtle">
                    <td className="py-1.5 text-left font-mono text-xs text-foreground">
                      {variant.name}
                      {role && (
                        <span className="ml-1.5 text-2xs text-foreground-subtle">({role})</span>
                      )}
                    </td>
                    <td className="py-1.5 text-right text-foreground-muted">
                      {pct(variant.exact_match)}
                    </td>
                    <td className="py-1.5 text-right text-foreground-muted">
                      {pct(variant.token_f1)}
                    </td>
                    <td className="py-1.5 text-right text-foreground-muted">
                      {pct(variant.contains_gold)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border-subtle bg-surface-2 px-3 py-2.5">
            <p className="text-2xs uppercase tracking-wider text-foreground-faint">
              Candidate vs baseline
            </p>
            <p className="mt-1 text-sm text-foreground">
              exact match{" "}
              <span className="font-semibold text-success">
                {signedPoints(metrics.improvement_exact_match)}
              </span>
              , token F1{" "}
              <span className="font-semibold text-success">
                {signedPoints(metrics.improvement_token_f1)}
              </span>
            </p>
          </div>
          <div className="rounded-md border border-border-subtle bg-surface-2 px-3 py-2.5">
            <p className="text-2xs uppercase tracking-wider text-foreground-faint">
              Regressions surfaced
            </p>
            <p className="mt-1 text-sm text-foreground">
              <span className="font-semibold text-warning">{metrics.regressions}</span> of{" "}
              {metrics.n_cases} cases scored below baseline
            </p>
          </div>
        </div>

        {regressions.length > 0 && (
          <ul className="space-y-1.5">
            {regressions.slice(0, 3).map((regression) => (
              <li
                key={regression.case_id}
                className="flex items-start gap-2 text-2xs text-foreground-muted"
              >
                <span className="mt-1 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                <span className="font-mono text-foreground-subtle">{regression.case_id}</span>{" "}
                {regression.reason}
              </li>
            ))}
          </ul>
        )}

        {urls && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm" variant="outline">
              <a href={urls.report} target="_blank" rel="noreferrer">
                <FileText />
                Full report
              </a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={urls.fixture} target="_blank" rel="noreferrer">
                Fixture
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  title,
  value,
  subtitle,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: typeof Target;
  loading: boolean;
}) {
  return (
    <Card>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <p className="text-2xs font-medium uppercase tracking-wider text-foreground-faint">
            {title}
          </p>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-2 text-foreground-muted">
            <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
          </div>
        </div>
        {loading ? (
          <Skeleton className="mt-2 h-7 w-20" />
        ) : (
          <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
        )}
        {subtitle && <p className="mt-0.5 text-2xs text-foreground-subtle">{subtitle}</p>}
      </div>
    </Card>
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
      <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">{value}</p>
      {hint && (
        <p className="mt-0.5 text-2xs text-foreground-subtle truncate">{hint}</p>
      )}
    </div>
  );
}
