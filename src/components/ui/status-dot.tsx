import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "info" | "muted";

const TONE_TEXT: Record<Tone, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  info: "text-info",
  muted: "text-foreground-faint",
};

interface StatusDotProps {
  tone?: Tone;
  /** Pulse a soft halo around the dot — use for "live" indicators. */
  pulse?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_PX: Record<NonNullable<StatusDotProps["size"]>, string> = {
  sm: "h-1.5 w-1.5",
  md: "h-2 w-2",
  lg: "h-2.5 w-2.5",
};

/**
 * StatusDot — semantic colored dot. The pulse variant uses a CSS halo,
 * not a JS animation, so it stays cheap on long lists.
 */
export function StatusDot({
  tone = "muted",
  pulse,
  size = "md",
  className,
}: StatusDotProps) {
  return (
    <span className={cn("relative inline-flex", className)}>
      <span
        className={cn(
          "rounded-full bg-current",
          TONE_TEXT[tone],
          SIZE_PX[size],
          pulse && "pulse-halo",
        )}
        aria-hidden
      />
    </span>
  );
}
