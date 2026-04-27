"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Compass,
  LayoutDashboard,
  ListChecks,
  Map,
  Search,
  Settings,
  Zap,
} from "lucide-react";
import { useCommandPalette } from "./CommandPalette";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/kbd";
import { cn, isMac } from "@/lib/utils";
import { PROJECT } from "@/lib/project";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  desc?: string;
}

const PRIMARY: NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard, desc: "Dashboard" },
  { href: "/telemetry", label: "Telemetry", icon: Activity, desc: "/api/stats" },
  { href: "/capabilities", label: "Capabilities", icon: ListChecks, desc: "MVP scope" },
  { href: "/roadmap", label: "Roadmap", icon: Map, desc: "Stage + plan" },
];

const SECONDARY: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { setOpen: setCommandOpen } = useCommandPalette();
  const metaKey = isMac() ? "⌘" : "Ctrl";

  const renderItem = (item: NavItem) => {
    const active =
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors duration-150",
          active
            ? "bg-surface-2 text-foreground"
            : "text-foreground-muted hover:bg-surface-2 hover:text-foreground",
        )}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-r bg-brand" />
        )}
        <item.icon
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            active ? "text-brand" : "text-foreground-faint group-hover:text-foreground-muted",
          )}
          strokeWidth={active ? 2 : 1.75}
        />
        <span className="font-medium tracking-tight">{item.label}</span>
        {item.desc && (
          <span className="ml-auto text-2xs text-foreground-faint">
            {item.desc}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside className="flex h-screen w-[216px] shrink-0 flex-col border-r border-border-subtle bg-surface">
      <div className="flex h-12 items-center gap-2 border-b border-border-subtle px-3">
        <Link
          href="/"
          className="flex items-center gap-2 group min-w-0"
          aria-label={`${PROJECT.name} home`}
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-brand-foreground shrink-0">
            <Zap className="h-3.5 w-3.5" strokeWidth={2.5} />
          </div>
          <p className="text-sm font-semibold tracking-tight text-foreground truncate">
            {PROJECT.name}
          </p>
        </Link>
      </div>

      <div className="px-2 pt-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setCommandOpen(true)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md border border-border bg-surface px-2.5 h-7 text-xs",
                "text-foreground-faint hover:text-foreground-muted hover:border-border-strong transition-colors",
              )}
            >
              <Search className="h-3 w-3 shrink-0" />
              <span className="flex-1 text-left">Search…</span>
              <span className="flex items-center gap-1">
                <Kbd>{metaKey}</Kbd>
                <Kbd>K</Kbd>
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Command palette</TooltipContent>
        </Tooltip>
      </div>

      <nav className="flex-1 px-2 pt-3 space-y-0.5 overflow-y-auto">
        <p className="px-2.5 mb-1 text-2xs font-medium uppercase tracking-wider text-foreground-faint">
          Workspace
        </p>
        {PRIMARY.map(renderItem)}

        <p className="mt-4 px-2.5 mb-1 text-2xs font-medium uppercase tracking-wider text-foreground-faint">
          Account
        </p>
        {SECONDARY.map(renderItem)}
      </nav>

      <div className="border-t border-border-subtle p-3">
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-2.5 py-1.5">
          <Compass className="h-3 w-3 text-foreground-faint shrink-0" />
          <div className="leading-none min-w-0">
            <p className="text-2xs font-medium text-foreground-muted truncate">
              {PROJECT.stage}
            </p>
            <p className="mt-0.5 text-2xs text-foreground-faint truncate">
              {PROJECT.category} · {PROJECT.track}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
