"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * App-wide toast outlet. Mounted once in the root layout. Themed to match
 * the dashboard surface palette via the [data-sonner-toaster] CSS rules
 * in globals.css.
 */
export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="bottom-right"
      gap={8}
      closeButton
      offset={16}
      toastOptions={{
        className:
          "!bg-surface-2 !border !border-border-strong !text-foreground !rounded-lg !shadow-popover",
        descriptionClassName: "!text-foreground-muted !text-xs",
      }}
    />
  );
}
