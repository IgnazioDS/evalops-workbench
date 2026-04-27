"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const SEGMENT_LABELS: Record<string, string> = {
  "": "Overview",
  telemetry: "Telemetry",
  capabilities: "Capabilities",
  roadmap: "Roadmap",
  settings: "Settings",
};

function labelFor(segment: string): string {
  return SEGMENT_LABELS[segment] ?? segment;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { href: string; label: string }[] = [
    { href: "/", label: "Home" },
  ];
  let acc = "";
  for (const segment of segments) {
    acc += `/${segment}`;
    crumbs.push({ href: acc, label: labelFor(segment) });
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-sm text-foreground-muted"
    >
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={c.href} className="flex items-center gap-1">
            {i === 0 ? (
              <Link
                href={c.href}
                className="flex h-6 w-6 items-center justify-center rounded text-foreground-faint hover:text-foreground transition-colors"
                aria-label="Home"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
              </Link>
            ) : isLast ? (
              <span className="font-medium text-foreground">{c.label}</span>
            ) : (
              <Link
                href={c.href}
                className={cn(
                  "rounded px-1 transition-colors",
                  "hover:text-foreground",
                )}
              >
                {c.label}
              </Link>
            )}
            {!isLast && (
              <ChevronRight className="h-3 w-3 text-foreground-faint" />
            )}
          </span>
        );
      })}
    </nav>
  );
}
