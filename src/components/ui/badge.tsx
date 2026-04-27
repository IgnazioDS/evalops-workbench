import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge — small status pill. Variants are calibrated so default lives in
 * neutral gray (chrome), and semantic variants light up only when needed.
 */
const badgeVariants = cva(
  cn(
    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
    "text-2xs font-medium tabular-nums select-none transition-colors",
  ),
  {
    variants: {
      variant: {
        default:
          "border-border-strong bg-surface-2 text-foreground-muted",
        outline:
          "border-border bg-transparent text-foreground-muted",
        brand:
          "border-brand/30 bg-brand/10 text-brand",
        success:
          "border-success/30 bg-success/10 text-success",
        warning:
          "border-warning/30 bg-warning/10 text-warning",
        danger:
          "border-danger/30 bg-danger/10 text-danger",
        info:
          "border-info/30 bg-info/10 text-info",
        processing:
          "border-info/30 bg-info/10 text-info",
        muted:
          "border-border bg-surface-2 text-foreground-faint",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
