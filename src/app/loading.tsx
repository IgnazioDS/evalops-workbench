import { Skeleton } from "@/components/ui/skeleton";

/**
 * Root-level loading skeleton. Next.js renders this between route
 * transitions while the page's data dependencies resolve.
 */
export default function Loading() {
  return (
    <>
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border-subtle bg-background px-5">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-24 rounded-md" />
          <Skeleton className="h-7 w-7 rounded-md" />
          <Skeleton className="h-7 w-7 rounded-md" />
        </div>
      </div>
      <div className="dot-grid flex-1 overflow-hidden">
        <div className="mx-auto max-w-6xl space-y-5 p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[110px] rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-32 rounded-lg" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Skeleton className="h-64 lg:col-span-1 rounded-lg" />
            <Skeleton className="h-64 lg:col-span-2 rounded-lg" />
          </div>
        </div>
      </div>
    </>
  );
}
