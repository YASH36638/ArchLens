import { describe, expect, it } from 'vitest';
import type { ScoreBreakdown } from '@archlens/shared-types';
import { enterpriseAssessmentFromReport } from '@archlens/shared-types';

const breakdown: ScoreBreakdown = {
  complexity: 80,
  duplication: 90,
  coupling: 70,
  cohesion: 80,
  smells: 85,
  overall: 77.4,
};

describe('enterprise assessment model', () => {
  it('weights hygiene 40, security 35, architecture 25', () => {
    const result = enterpriseAssessmentFromReport(breakdown, [], {
      hasNodeManifest: true,
      vulnerableScore: 100,
    });
    expect(result.sections.hygiene.weight).toBe(0.4);
    expect(result.sections.security.weight).toBe(0.35);
    expect(result.sections.architecture.weight).toBe(0.25);
  });

  it('uses stored-style options for vulnerable score', () => {
    const result = enterpriseAssessmentFromReport(breakdown, [], {
      hasNodeManifest: true,
      vulnerableScore: 80,
    });
    expect(result.sections.security.axes.find((axis) => axis.id === 'vulnerable')?.value).toBe(80);
  });
});
