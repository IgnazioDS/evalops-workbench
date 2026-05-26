import { ArrowUpRight } from "lucide-react";
import { PROJECT } from "@/lib/project";

/**
 * Eleventh brand surface — shared across the six-system fleet.
 *
 * The two-bar "11" mark is drawn from theme tokens (`--foreground` +
 * `--brand`) so the accent bar tracks the active phosphor-green accent
 * and the off-white bar flips dark on the light theme automatically.
 *
 * These pieces give every dashboard page a persistent, audience-correct
 * link back to the parent brand (eleventh.dev) and the fleet index.
 */

/** The Eleventh two-bar "11" mark, sized in px. */
export function EleventhMark({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="7" y="4" width="3" height="16" rx="0.6" fill="hsl(var(--foreground))" />
      <rect x="14" y="4" width="3" height="16" rx="0.6" fill="hsl(var(--brand))" />
    </svg>
  );
}

/** Sidebar header tile — links out to the parent brand at eleventh.dev. */
export function EleventhBrandTile() {
  return (
    <a
      href={PROJECT.eleventh_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-6 w-6 items-center justify-center rounded-md border border-border-strong bg-background shrink-0 transition-opacity hover:opacity-80"
      aria-label="Eleventh Solutions — eleventh.dev"
    >
      <EleventhMark />
    </a>
  );
}

/** Sidebar footer — builder attribution + the six-system fleet index. */
export function EleventhFooter() {
  return (
    <div className="space-y-0.5">
      <a
        href={PROJECT.eleventh_url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-2 rounded-md px-2.5 py-1.5 text-foreground-muted hover:bg-surface-2 hover:text-foreground transition-colors"
      >
        <EleventhMark size={12} />
        <span className="text-2xs font-medium truncate">
          Built by eleventh<span className="text-brand">.</span>
        </span>
        <ArrowUpRight className="ml-auto h-3 w-3 text-foreground-faint group-hover:text-foreground-muted shrink-0" />
      </a>
      <a
        href={PROJECT.fleet_url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-2 rounded-md px-2.5 py-1 text-foreground-faint hover:text-foreground-muted transition-colors"
      >
        <span className="text-2xs truncate">Explore the fleet · 6 systems</span>
        <ArrowUpRight className="ml-auto h-3 w-3 shrink-0" />
      </a>
    </div>
  );
}
