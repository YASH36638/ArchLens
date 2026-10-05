import { Brain } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const SIZES = {
  sm: { wrap: 'h-8 w-8', icon: 'h-4 w-4' },
  md: { wrap: 'h-10 w-10', icon: 'h-5 w-5' },
  lg: { wrap: 'h-14 w-14', icon: 'h-7 w-7' },
} as const;

interface KellyMarkProps {
  size?: keyof typeof SIZES;
  className?: string;
  iconClassName?: string;
}

/** Shared Kelly identity mark (brain) used in FAB, modal, and chat. */
export function KellyMark({ size = 'md', className, iconClassName }: KellyMarkProps) {
  const dims = SIZES[size];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground ring-1 ring-white/25',
        dims.wrap,
        className
      )}
      aria-hidden="true"
    >
      <Brain className={cn(dims.icon, iconClassName)} strokeWidth={2} />
    </span>
  );
}
