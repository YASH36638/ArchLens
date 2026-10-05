'use client';

import { useState, type ReactNode } from 'react';
import { Code, Loader2, Network, User, Users, UserX } from 'lucide-react';
import { useRepoMeta } from '@/hooks/use-repo-meta';
import { cn } from '@/lib/utils/cn';
import { Popover } from '@/components/ui/popover';

interface HoverMetaChipProps {
  repoId: string;
  label: string;
  kind: 'reportsTo' | 'collaborators' | 'contributors' | 'languages';
  className?: string;
  iconClassName?: string;
  tooltip?: string;
  iconOnly?: boolean;
}

const KIND_ICONS = {
  reportsTo: Network,
  collaborators: Users,
  contributors: User,
  languages: Code,
} as const;

function PopoverEmpty({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5">
      <UserX className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm leading-5 text-muted-foreground">{message}</p>
    </div>
  );
}

export function HoverMetaChip({
  repoId,
  label,
  kind,
  className,
  iconClassName,
  tooltip,
  iconOnly = false,
}: HoverMetaChipProps) {
  const [open, setOpen] = useState(false);
  const { meta, loading, error } = useRepoMeta(repoId, open);
  const Icon = KIND_ICONS[kind];

  let body: ReactNode = null;
  if (loading) {
    body = (
      <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading…
      </div>
    );
  } else if (error) {
    body = (
      <p className="text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  } else if (meta) {
    if (kind === 'reportsTo') {
      body = meta.reportsTo?.login ? (
        <p className="text-sm text-muted-foreground">
          {meta.reportsTo.login}
          <span className="mt-1.5 block text-sm leading-relaxed">
            {meta.reportsTo.note ??
              'GitHub does not expose a reports-to field. Configure this in your org directory later.'}
          </span>
        </p>
      ) : (
        <PopoverEmpty message="Reporting line not configured yet. Add this in your organization directory when available." />
      );
    } else if (kind === 'collaborators') {
      body =
        meta.collaborators.length === 0 ? (
          <PopoverEmpty message="No collaborators returned from GitHub for this repository." />
        ) : (
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {meta.collaborators.map((p) => (
              <li key={p.login} className="flex items-center gap-2 py-1 text-sm">
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt="" className="h-5 w-5 rounded-full" />
                ) : null}
                <span className="font-medium">{p.login}</span>
              </li>
            ))}
          </ul>
        );
    } else if (kind === 'contributors') {
      body =
        meta.contributors.length === 0 ? (
          <PopoverEmpty message="No contributor activity was found for this repository." />
        ) : (
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {meta.contributors.map((p) => (
              <li key={p.login} className="flex items-center justify-between gap-2 py-1 text-sm">
                <span className="flex items-center gap-2">
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt="" className="h-5 w-5 rounded-full" />
                  ) : null}
                  <span className="font-medium">{p.login}</span>
                </span>
                {p.contributions != null ? (
                  <span className="text-muted-foreground">{p.contributions}</span>
                ) : null}
              </li>
            ))}
          </ul>
        );
    } else {
      body =
        meta.languages.length === 0 ? (
          <PopoverEmpty message="Language breakdown is not available yet for this repository." />
        ) : (
          <div className="space-y-2">
            <div className="flex h-2 overflow-hidden rounded-full bg-muted">
              {meta.languages.map((l) => (
                <div
                  key={l.name}
                  style={{ width: `${l.percent}%`, backgroundColor: l.color }}
                  title={`${l.name} ${l.percent}%`}
                />
              ))}
            </div>
            <ul className="space-y-1">
              {meta.languages.slice(0, 8).map((l) => (
                <li key={l.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                    {l.name}
                  </span>
                  <span className="text-muted-foreground">{l.percent}%</span>
                </li>
              ))}
            </ul>
          </div>
        );
    }
  }

  const trigger = (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center rounded-full border font-medium leading-none transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/25',
        iconOnly ? 'h-6 w-6' : 'h-6 gap-1 px-2 text-[11px]',
        className
      )}
      aria-label={`View ${label.toLowerCase()}${tooltip ? `. ${tooltip}` : ''}`}
      title={iconOnly ? label : undefined}
    >
      <Icon className={cn('h-3 w-3 shrink-0 opacity-90', iconClassName)} aria-hidden="true" />
      {iconOnly ? <span className="sr-only">{label}</span> : <span>{label}</span>}
    </button>
  );

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      contentLabel={label}
      className="w-72 max-w-[calc(100vw-2rem)]"
      trigger={trigger}
    >
      <p className="mb-2 text-sm font-semibold text-foreground">{label}</p>
      {body}
    </Popover>
  );
}
