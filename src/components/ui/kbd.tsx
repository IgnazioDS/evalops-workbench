import { cn } from "@/lib/utils";

/**
 * Kbd — keyboard shortcut chip. Renders one or more keys as inline labels.
 *
 *   <Kbd>⌘</Kbd> <Kbd>K</Kbd>
 *
 * For a tight pair, pass the `pair` prop with two strings.
 */
export function Kbd({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("kbd", className)} {...props}>
      {children}
    </span>
  );
}

interface KbdGroupProps {
  keys: string[];
  className?: string;
}

export function KbdGroup({ keys, className }: KbdGroupProps) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {keys.map((k, i) => (
        <Kbd key={i}>{k}</Kbd>
      ))}
    </span>
  );
}
