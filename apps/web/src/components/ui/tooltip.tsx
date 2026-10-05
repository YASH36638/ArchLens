'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: 'top' | 'bottom';
  className?: string;
  maxWidth?: string;
}

export function Tooltip({
  content,
  children,
  side = 'top',
  className,
  maxWidth = 'max-w-[240px]',
}: TooltipProps) {
  const id = useId();

  return (
    <span className={cn('group/tip relative inline-flex', className)}>
      <span aria-describedby={id} className="inline-flex h-full w-full min-w-0">
        {children}
      </span>
      <span
        id={id}
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 rounded-md border border-border bg-popover px-2.5 py-1.5 text-metadata leading-5 text-popover-foreground opacity-0 shadow-md transition-opacity duration-150 ease-out',
          'group-hover/tip:opacity-100 group-focus-within/tip:opacity-100',
          side === 'top' && 'bottom-full left-1/2 mb-2 -translate-x-1/2',
          side === 'bottom' && 'left-1/2 top-full mt-2 -translate-x-1/2',
          maxWidth
        )}
      >
        {content}
      </span>
    </span>
  );
}
