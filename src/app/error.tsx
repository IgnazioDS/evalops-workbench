"use client";

import { useEffect } from "react";
import { AlertOctagon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Root error boundary. Next.js mounts this when a rendered route throws.
 * Keep the UI uncluttered; the goal is to reassure the user the app didn't
 * fall on its face and offer one obvious recovery action.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.error("Route error:", error);
    }
  }, [error]);

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-danger/30 bg-danger/10 text-danger">
          <AlertOctagon className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-foreground-muted">
          The page hit an unexpected error.
          {error.digest && (
            <span className="block mt-2 font-mono text-2xs text-foreground-faint">
              ref: {error.digest}
            </span>
          )}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button onClick={reset} variant="primary" size="default">
            <RefreshCw />
            Try again
          </Button>
          <Button
            asChild
            variant="outline"
            size="default"
          >
            <a href="/">Go home</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
