import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface-2 text-foreground-muted">
          <FileQuestion className="h-5 w-5" />
        </div>
        <p className="text-2xs font-mono uppercase tracking-wider text-foreground-faint">
          404
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
          Page not found
        </h2>
        <p className="mt-2 text-sm text-foreground-muted">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
        <div className="mt-5 flex justify-center">
          <Button asChild variant="primary" size="default">
            <Link href="/">
              <ArrowLeft />
              Back to overview
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
