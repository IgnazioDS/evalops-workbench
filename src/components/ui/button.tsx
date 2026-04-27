import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button — the canonical interactive element. Variants and sizes calibrated
 * for a Vercel-grade dashboard: tight padding, restrained palette, single-px
 * focus ring, no shadow chrome unless explicitly elevated.
 */
const buttonVariants = cva(
  cn(
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap",
    "rounded-md font-medium transition-all duration-150 ease-out-expo",
    "select-none outline-none",
    "focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:shrink-0",
  ),
  {
    variants: {
      variant: {
        default:
          "bg-foreground text-background hover:bg-foreground/90 active:scale-[0.98]",
        primary:
          "bg-brand text-brand-foreground hover:bg-brand-strong active:scale-[0.98] shadow-glow-brand",
        secondary:
          "bg-surface-2 text-foreground border border-border hover:border-border-strong hover:bg-surface-3",
        ghost: "text-foreground-muted hover:bg-surface-2 hover:text-foreground",
        outline:
          "border border-border bg-transparent text-foreground-muted hover:border-border-strong hover:bg-surface-2 hover:text-foreground",
        danger:
          "bg-danger/90 text-foreground hover:bg-danger active:scale-[0.98]",
        link: "text-brand underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm: "h-7 px-2.5 text-xs [&_svg]:size-3.5",
        default: "h-8 px-3 text-sm [&_svg]:size-4",
        lg: "h-10 px-4 text-base [&_svg]:size-4",
        icon: "h-8 w-8 [&_svg]:size-4",
        "icon-sm": "h-7 w-7 [&_svg]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
