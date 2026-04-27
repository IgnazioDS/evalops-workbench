import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

/**
 * Input — single-line text field. Vercel-grade defaults: 8px radius,
 * subtle border that strengthens on hover, brand-tinted focus ring.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-8 w-full rounded-md border border-border bg-surface px-3 text-sm",
        "text-foreground placeholder:text-foreground-faint",
        "transition-[border-color,background-color] duration-150",
        "hover:border-border-strong",
        "focus-visible:outline-none focus-visible:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
