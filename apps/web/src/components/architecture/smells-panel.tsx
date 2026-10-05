'use client';

import type { Smell } from '@archlens/ir-schema';

interface SmellsPanelProps {
  smells: Smell[];
  filterPath: string | null;
  filterLabel?: string | null;
  onClear: () => void;
}

function matchesPath(smell: Smell, path: string): boolean {
  const file = smell.file.replace(/\\/g, '/');
  const needle = path.replace(/\\/g, '/');
  return (
    file === needle ||
    file.startsWith(`${needle}/`) ||
    file.endsWith(`/${needle}`) ||
    file.includes(needle)
  );
}

export function SmellsPanel({ smells, filterPath, filterLabel, onClear }: SmellsPanelProps) {
  const visible = filterPath ? smells.filter((smell) => matchesPath(smell, filterPath)) : smells;

  return (
    <div
      className="flex h-full min-h-0 flex-col rounded-lg border border-border bg-card"
      data-testid="smells-panel"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
        <h3 className="text-card-title tracking-tight">Smells / problems</h3>
        {filterPath ? (
          <button
            type="button"
            className="inline-flex min-h-11 items-center px-2 text-button font-medium text-primary hover:underline md:min-h-8"
            onClick={onClear}
          >
            Show all
          </button>
        ) : null}
      </div>
      {filterPath ? (
        <p
          className="shrink-0 truncate border-b border-border px-3 py-1 text-metadata text-muted-foreground"
          title={filterPath}
        >
          Filtered to {filterLabel ?? filterPath}
        </p>
      ) : null}
      {visible.length === 0 ? (
        <p className="px-3 py-4 text-body text-muted-foreground">
          {smells.length === 0
            ? 'No smells on the latest scan.'
            : 'No smells match this selection.'}
        </p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          {visible.map((smell) => {
            const line = smell.location?.startLine;
            const headline = line != null ? `${smell.file}:${line}` : smell.file;
            return (
              <li
                key={smell.id}
                className="rounded-md border border-border/70 bg-muted/30 px-2.5 py-1.5"
                title={smell.message}
              >
                <p className="truncate font-mono text-metadata text-foreground">
                  {headline} — {smell.kind}
                </p>
                <p className="truncate text-metadata text-muted-foreground">{smell.message}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
