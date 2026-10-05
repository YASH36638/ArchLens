import { cn } from '@/lib/utils/cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-shimmer rounded-md bg-muted/80', className)} aria-hidden="true" />
  );
}

export function SkeletonCard({ className, lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div
      className={cn('rounded-lg border border-border bg-card p-4 shadow-xs', className)}
      aria-hidden="true"
    >
      <Skeleton className="mb-3 h-3 w-24" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'mt-2 w-2/3' : 'mt-2 w-full')} />
      ))}
    </div>
  );
}

/** Neutral fallback while a route without its own loading.tsx resolves. */
export function PageSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-7 w-48 max-w-full" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>
      <SkeletonCard lines={5} className="min-h-48" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading dashboard…</span>
      <div className="grid shrink-0 grid-cols-1 gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <SkeletonCard key={i} className="h-24" lines={1} />
        ))}
      </div>
      <Skeleton className="h-4 w-full max-w-3xl" />
      <Skeleton className="min-h-0 flex-1 rounded-lg" />
    </div>
  );
}

export function GlossarySkeleton() {
  return (
    <div className="space-y-3" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading glossary…</span>
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1 rounded-md" />
        <Skeleton className="h-9 w-40 rounded-md" />
      </div>
      <div className="grid gap-3 lg:grid-cols-[13.5rem_minmax(0,1fr)]">
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-md" />
          ))}
        </div>
        <SkeletonCard lines={8} className="min-h-64" />
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-6xl space-y-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading form…</span>
      <Skeleton className="h-5 w-64 max-w-full" />
      <SkeletonCard lines={6} />
    </div>
  );
}

export function WorkbenchSkeleton() {
  return (
    <div
      className="grid min-h-[280px] flex-1 grid-cols-1 gap-3 md:grid-cols-[minmax(12rem,22%)_minmax(0,1fr)] lg:min-h-0 lg:grid-cols-[22%_minmax(0,1fr)_28%]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading architecture…</span>
      <SkeletonCard lines={10} className="h-full" />
      <SkeletonCard lines={4} className="h-full" />
      <SkeletonCard lines={8} className="h-full" />
    </div>
  );
}

/** Projects page preview while data loads */
export function ProjectsListSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading projects…</span>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} lines={2} className="h-[84px]" />
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-premium">
        <div className="hidden border-b border-border bg-muted/40 px-5 py-3 md:grid md:grid-cols-[96px_minmax(0,1.3fr)_minmax(0,0.95fr)_minmax(0,1.2fr)] md:gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-3.5 w-16" />
          ))}
        </div>
        <ul className="divide-y divide-border/60">
          {Array.from({ length: 4 }, (_, i) => (
            <li
              key={i}
              className="grid grid-cols-1 gap-4 px-5 py-4 md:grid-cols-[96px_minmax(0,1.3fr)_minmax(0,0.95fr)_minmax(0,1.2fr)] md:items-center"
            >
              <Skeleton className="mx-auto h-[72px] w-[72px] rounded-full md:mx-0" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48 max-w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-7 w-16 rounded-md" />
                  <Skeleton className="h-7 w-24 rounded-md" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-28" />
                <div className="flex gap-2">
                  <Skeleton className="h-7 w-20 rounded-md" />
                  <Skeleton className="h-7 w-24 rounded-md" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-7 w-24 rounded-md" />
                <Skeleton className="h-7 w-20 rounded-md" />
                <Skeleton className="h-7 w-28 rounded-md" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
