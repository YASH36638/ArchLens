import type { ReportModuleScoreDto } from '@archlens/shared-types';

export type ModuleShape =
  | 'dual-hub'
  | 'stable-provider'
  | 'pure-consumer'
  | 'entrypoint'
  | 'leaf'
  | 'standard';

export interface ModuleShapeBadge {
  shape: ModuleShape;
  label: string;
  /** Tailwind colour utility for the chip. */
  color: string;
  /** Short tooltip explaining why this label applies. */
  description: string;
}

/**
 * Derive a structural shape from a module's coupling signal. The badges turn
 * raw fanIn / fanOut / instability numbers into actionable architectural
 * categories — "god module", "stable provider", etc. Returns null when the
 * module doesn't fit any non-trivial category.
 */
export function classifyModuleShape(m: ReportModuleScoreDto): ModuleShapeBadge | null {
  const fanIn = m.fanIn ?? 0;
  const fanOut = m.fanOut ?? 0;
  const instab = m.instability;
  // Dual hub: depended on AND depends widely. Classic god-module signal.
  if (fanIn >= 3 && fanOut >= 3) {
    return {
      shape: 'dual-hub',
      label: 'dual hub',
      color: 'border border-border bg-muted/70 text-grade-e',
      description: `Depended on by ${fanIn} other modules AND depends on ${fanOut} — classic god-module shape. Worth splitting.`,
    };
  }
  // Stable provider: depended on, doesn't depend on others. Healthy data/types layer.
  if (fanIn >= 2 && fanOut === 0) {
    return {
      shape: 'stable-provider',
      label: 'stable provider',
      color: 'border border-border bg-muted/70 text-grade-a',
      description: `Depended on by ${fanIn} modules with no outgoing deps — a healthy stable provider (typical for data / types / utils).`,
    };
  }
  // Pure consumer: depends on others, nothing depends back. App-layer code.
  if (fanIn === 0 && fanOut >= 2) {
    const isEntrypoint = /(^|\W)(scripts?|bin|cli|main|cmd|app|entrypoint)(\W|$)/i.test(m.name);
    if (isEntrypoint) {
      return {
        shape: 'entrypoint',
        label: 'entrypoint',
        color: 'border border-border bg-muted/70 text-ai',
        description: `Imports from ${fanOut} other modules, nothing imports it — looks like an entrypoint / runner module.`,
      };
    }
    return {
      shape: 'pure-consumer',
      label: 'pure consumer',
      color: 'border border-border bg-muted/70 text-grade-c',
      description: `Imports from ${fanOut} other modules, nothing imports it back. Volatile by Martin’s definition (I=1).`,
    };
  }
  // Stable but only depended on once — still notable.
  if (fanIn >= 1 && fanOut === 0 && (instab ?? 1) <= 0.2) {
    return {
      shape: 'leaf',
      label: 'leaf',
      color: 'border border-border bg-muted/70 text-muted-foreground',
      description: `No outgoing deps. Self-contained leaf module.`,
    };
  }
  return null;
}
