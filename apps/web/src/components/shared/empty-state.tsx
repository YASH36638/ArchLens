import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
  testId?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
  testId,
}: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center px-6 py-14 text-center', className)}
      data-testid={testId}
    >
      <div
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground"
        aria-hidden="true"
      >
        <Icon className="h-7 w-7 stroke-[1.5]" />
      </div>
      <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="mt-2 max-w-md text-body text-muted-foreground">{description}</p>
      {actionLabel && (actionHref || onAction) ? (
        <div className="mt-5">
          {actionHref ? (
            <Button asChild variant="outline">
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
