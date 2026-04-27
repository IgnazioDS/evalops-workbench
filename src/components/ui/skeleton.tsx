import { cn } from "@/lib/utils";

/**
 * Skeleton — single-purpose shimmer block. Use for layout loading states.
 * Sized via className (h-, w-, rounded-).
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton-shimmer rounded-md", className)}
      {...props}
    />
  );
}
