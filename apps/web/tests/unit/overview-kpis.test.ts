import { describe, expect, it } from 'vitest';
import type { ScoreBreakdown } from '@archlens/shared-types';
import {
  codeHealthFromBreakdown,
  dxScoreFromSmellKinds,
  modularityFromBreakdown,
  overviewKpisFromReport,
  overviewRadarFromReport,
} from '@/lib/assessment/overview-kpis';

const breakdown: ScoreBreakdown = {
  complexity: 80,
  duplication: 90,
  coupling: 70,
  cohesion: 80,
  smells: 85,
  overall: 77.4,
};

describe('overview KPIs', () => {
  it('uses overall as code health, rounded', () => {
    expect(codeHealthFromBreakdown(breakdown)).toBe(77);
  });

  it('averages coupling and cohesion for modularity', () => {
    expect(modularityFromBreakdown(breakdown)).toBe(75);
  });

  it('scores DX as the mean of five hygiene axes', () => {
    expect(dxScoreFromSmellKinds([])).toBe(100);
    expect(dxScoreFromSmellKinds(['missing-readme'])).toBe(80);
    expect(
      dxScoreFromSmellKinds([
        'missing-readme',
        'missing-ci',
        'missing-linter-config',
        'missing-lockfile',
        'large-binary-file',
      ])
    ).toBe(0);
  });

  it('builds the full overview set', () => {
    expect(overviewKpisFromReport(breakdown, ['missing-ci'])).toEqual({
      codeHealth: 77,
      modularity: 75,
      dxScore: 80,
    });
  });

  it('builds a six-axis hexagon including health, modularity, and hygiene', () => {
    expect(overviewRadarFromReport(breakdown, ['missing-ci'])).toEqual([
      { axis: 'Code health', value: 77 },
      { axis: 'Modularity', value: 75 },
      { axis: 'Complexity', value: 80 },
      { axis: 'Duplication', value: 90 },
      { axis: 'Smells', value: 85 },
      { axis: 'Hygiene', value: 80 },
    ]);
  });
});
