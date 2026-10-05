import type { ScoreBreakdown } from '@archlens/shared-types';
import { hygieneRadarFromSmellKinds } from './hygiene-radar';

export interface OverviewKpis {
  codeHealth: number;
  modularity: number;
  dxScore: number;
}

export interface OverviewRadarAxis {
  axis: string;
  value: number;
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Headline overall score from the latest scan. */
export function codeHealthFromBreakdown(breakdown: ScoreBreakdown): number {
  return clampScore(breakdown.overall);
}

/** Average of coupling and cohesion. */
export function modularityFromBreakdown(breakdown: ScoreBreakdown): number {
  return clampScore((breakdown.coupling + breakdown.cohesion) / 2);
}

/** Mean of the five repo-hygiene axes (README, CI, lint, lockfile, clean tree). */
export function dxScoreFromSmellKinds(kinds: readonly string[] | undefined): number {
  const axes = hygieneRadarFromSmellKinds(kinds);
  if (axes.length === 0) return 0;
  const mean = axes.reduce((sum, axis) => sum + axis.value, 0) / axes.length;
  return clampScore(mean);
}

export function overviewKpisFromReport(
  breakdown: ScoreBreakdown,
  presentSmellKinds: readonly string[] | undefined
): OverviewKpis {
  return {
    codeHealth: codeHealthFromBreakdown(breakdown),
    modularity: modularityFromBreakdown(breakdown),
    dxScore: dxScoreFromSmellKinds(presentSmellKinds),
  };
}

/**
 * Single hexagon for Overview: health + modularity + architecture KPIs +
 * hygiene/DX rolled into one Hygiene axis.
 */
export function overviewRadarFromReport(
  breakdown: ScoreBreakdown,
  presentSmellKinds: readonly string[] | undefined
): OverviewRadarAxis[] {
  const kpis = overviewKpisFromReport(breakdown, presentSmellKinds);
  return [
    { axis: 'Code health', value: kpis.codeHealth },
    { axis: 'Modularity', value: kpis.modularity },
    { axis: 'Complexity', value: clampScore(breakdown.complexity) },
    { axis: 'Duplication', value: clampScore(breakdown.duplication) },
    { axis: 'Smells', value: clampScore(breakdown.smells) },
    { axis: 'Hygiene', value: kpis.dxScore },
  ];
}
