'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  hint?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleSection({
  title,
  hint,
  children,
  defaultOpen = false,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      className="group rounded-lg border border-border bg-card"
      open={open}
      onToggle={(event) => {
        setOpen((event.currentTarget as HTMLDetailsElement).open);
      }}
    >
      <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 px-3 py-2 text-body font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
        <ChevronRight
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90"
          aria-hidden="true"
        />
        <span>{title}</span>
        {hint ? (
          <span className="ml-auto truncate text-metadata font-normal text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </summary>
      <div className="border-t border-border px-3 py-2.5">{children}</div>
    </details>
  );
}
