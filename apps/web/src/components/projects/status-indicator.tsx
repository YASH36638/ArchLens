import { cn } from '@/lib/utils/cn';

type RepoStatusKind = 'completed' | 'pending' | 'failed' | 'not-scanned';

const CONFIG: Record<RepoStatusKind, { label: string; dot: string; pulse?: boolean }> = {
  completed: {
    label: 'Completed',
    dot: 'bg-emerald-500',
    pulse: true,
  },
  pending: {
    label: 'Pending',
    dot: 'bg-amber-500',
  },
  failed: {
    label: 'Failed',
    dot: 'bg-red-500',
  },
  'not-scanned': {
    label: 'Not scanned',
    dot: 'bg-slate-400',
  },
};

interface StatusIndicatorProps {
  status: RepoStatusKind;
  className?: string;
}

export function StatusIndicator({ status, className }: StatusIndicatorProps) {
  const { label, dot, pulse } = CONFIG[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground',
        className
      )}
    >
      <span
        className={cn('h-2.5 w-2.5 shrink-0 rounded-full', dot, pulse && 'animate-status-pulse')}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
