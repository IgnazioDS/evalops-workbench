"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Sparkline } from "@/components/ui/sparkline";
import { cn, formatNumber } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";
import { useAnimatedNumber } from "@/lib/hooks";

interface StatCardProps {
  title: string;
  /** Numeric value drives the count-up animation. Pass undefined when loading. */
  value: number | undefined;
  /** Optional human-friendly subtitle ("vs. yesterday"). */
  subtitle?: string;
  /** Pre-formatted display override. Use for "—" / "1.2k" cases the formatter can't infer. */
  display?: string;
  icon: LucideIcon;
  trend?: { direction: "up" | "down" | "flat"; value: string };
  sparkData?: number[];
  loading?: boolean;
}

/**
 * StatCard — primary KPI surface. Numeric values count up on first render
 * (useAnimatedNumber). Sparkline lives in the lower-right when data is
 * available. The accent is intentionally restrained — no glow, no gradient,
 * just a subtle border treatment that strengthens on hover.
 */
export function StatCard({
  title,
  value,
  subtitle,
  display,
  icon: Icon,
  trend,
  sparkData,
  loading,
}: StatCardProps) {
  const animated = useAnimatedNumber(value ?? 0, 600);
  const formatted = display ?? formatNumber(Math.round(animated));

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-start justify-between mb-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-7 rounded-md" />
        </div>
        <Skeleton className="h-7 w-20 mb-2" />
        <Skeleton className="h-3 w-32" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative rounded-lg border border-border bg-surface p-4",
        "transition-colors duration-150 hover:border-border-strong",
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-2xs font-medium uppercase tracking-wider text-foreground-faint">
          {title}
        </p>
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-2 text-foreground-muted">
          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
        </div>
      </div>

      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
            {formatted}
          </p>
          <div className="mt-1 flex items-center gap-2">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-2xs font-medium tabular-nums",
                  trend.direction === "up" && "text-success",
                  trend.direction === "down" && "text-danger",
                  trend.direction === "flat" && "text-foreground-faint",
                )}
              >
                {trend.direction === "up" ? (
                  <ArrowUp className="h-3 w-3" />
                ) : trend.direction === "down" ? (
                  <ArrowDown className="h-3 w-3" />
                ) : (
                  <ArrowRight className="h-3 w-3" />
                )}
                {trend.value}
              </span>
            )}
            {subtitle && (
              <p className="text-2xs text-foreground-subtle truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {sparkData && sparkData.length > 1 && (
          <div className="text-foreground-faint group-hover:text-brand transition-colors duration-200">
            <Sparkline data={sparkData} width={72} height={26} />
          </div>
        )}
      </div>
    </div>
  );
}
