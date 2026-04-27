"use client";

import { ChevronDown, ExternalLink, Github, LifeBuoy, Settings, User } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { PROJECT } from "@/lib/project";

/**
 * UserMenu — repo-anchored dropdown. Showcase deploys don't carry a tenant
 * context (no auth), so the menu surfaces the GitHub repo + project metadata
 * instead of a tenant identifier.
 */
export function UserMenu() {
  const initials = PROJECT.system_slug.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-md p-1 hover:bg-surface-2 transition-colors group">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="bg-brand/15 text-brand text-2xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="font-mono text-2xs text-foreground-muted hidden sm:inline">
            {PROJECT.system_slug}
          </span>
          <ChevronDown className="h-3 w-3 text-foreground-faint group-hover:text-foreground-muted transition-colors" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center justify-between normal-case tracking-normal">
          <div className="flex flex-col gap-0.5">
            <span className="text-2xs uppercase tracking-wider text-foreground-faint">
              Project
            </span>
            <span className="text-xs text-foreground">{PROJECT.name}</span>
          </div>
          <Badge variant="brand">{PROJECT.stage}</Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a
            href={PROJECT.github_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2"
          >
            <Github className="h-3.5 w-3.5" /> GitHub
            <ExternalLink className="ml-auto h-3 w-3" />
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://${PROJECT.slug}.vercel.app`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2"
          >
            <User className="h-3.5 w-3.5" /> Landing page
            <ExternalLink className="ml-auto h-3 w-3" />
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a
            href="https://github.com/IgnazioDS/IgnazioDS/blob/main/TELEMETRY_SCHEMA.md"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2"
          >
            <LifeBuoy className="h-3.5 w-3.5" /> Telemetry schema
            <ExternalLink className="ml-auto h-3 w-3" />
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/settings" className="flex items-center gap-2">
            <Settings className="h-3.5 w-3.5" /> Settings
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
