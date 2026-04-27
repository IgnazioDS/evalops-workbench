"use client";

import { useEffect, useState } from "react";
import { fetchPublicStats, type PublicStats } from "@/lib/api";
import { StatusDot } from "@/components/ui/status-dot";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";
import { Breadcrumbs } from "./Breadcrumbs";

interface TopBarProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

/**
 * TopBar — sticky page header. On showcase deploys we use /api/stats
 * reachability as the canonical "system reachable" indicator since
 * /api/stats is the only public endpoint that exists.
 */
export function TopBar({ title, description, actions }: TopBarProps) {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    fetchPublicStats()
      .then((d) => {
        setStats(d);
        setConnected(true);
      })
      .catch(() => setConnected(false));
  }, []);

  const status = stats?.status;
  const tone =
    status === "operational"
      ? "success"
      : status === "degraded"
      ? "warning"
      : connected === false
      ? "danger"
      : "muted";
  const label =
    status === "operational"
      ? "Operational"
      : status === "degraded"
      ? "Degraded"
      : connected === false
      ? "Offline"
      : "Connecting";

  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border-subtle bg-background/85 px-5 backdrop-blur">
      <div className="flex min-w-0 items-center gap-3">
        <Breadcrumbs />
        <div className="min-w-0">
          <h1 className="text-sm font-semibold tracking-tight text-foreground truncate">
            {title}
          </h1>
          {description && (
            <p className="text-2xs text-foreground-subtle truncate">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {actions}

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1">
              <StatusDot tone={tone} pulse={status === "operational"} size="sm" />
              <span className="text-2xs font-medium text-foreground-muted hidden md:inline">
                {label}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {status === "operational"
              ? "/api/stats reachable"
              : status === "degraded"
              ? "/api/stats degraded — upstream cache likely stale"
              : connected === false
              ? "Could not reach /api/stats"
              : "Establishing connection…"}
          </TooltipContent>
        </Tooltip>

        <div className="h-4 w-px bg-border" aria-hidden />

        <ThemeToggle />

        <div className="h-4 w-px bg-border" aria-hidden />

        <UserMenu />
      </div>
    </header>
  );
}
