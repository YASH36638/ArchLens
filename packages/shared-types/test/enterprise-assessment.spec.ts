import { describe, expect, it } from 'vitest';
import type { ScoreBreakdown } from '../src/domain/score.js';
import { enterpriseAssessmentFromReport } from '../src/domain/enterprise-assessment.js';
import type { EnterpriseKpiMeasurements } from '../src/domain/enterprise-kpi.js';
import {
  coveragePercent,
  scoreDeadCodePercent,
  scoreSecretsFindings,
  scoreUnusedDependencyPercent,
} from '../src/domain/enterprise-kpi.js';

const breakdown: ScoreBreakdown = {
  complexity: 80,
  duplication: 90,
  coupling: 70,
  cohesion: 80,
  smells: 85,
  overall: 77.4,
};

const perfectKpi: EnterpriseKpiMeasurements = {
  documentationCoverage: 100,
  readmeQuality: 100,
  deadCode: 100,
  unusedDependencies: 100,
  lockfileLinting: 100,
  cleanTree: 100,
  secretsExposure: 100,
  vulnerableDependencies: 100,
  hasCriticalVulnerability: false,
  approvedLibraries: 100,
  apiSecurityRisk: 100,
  outdatedPackages: 100,
  licenseCompliance: 100,
};

describe('Carrier KPI normalization helpers', () => {
  it('computes documentation coverage from categories', () => {
    expect(coveragePercent(0, 6)).toBe(0);
    expect(coveragePercent(3, 6)).toBe(50);
    expect(coveragePercent(6, 6)).toBe(100);
  });

  it('bands dead code percent into Carrier scores', () => {
    expect(scoreDeadCodePercent(0)).toBe(100);
    expect(scoreDeadCodePercent(5)).toBe(100);
    expect(scoreDeadCodePercent(8)).toBe(85);
    expect(scoreDeadCodePercent(15)).toBe(70);
    expect(scoreDeadCodePercent(25)).toBe(50);
    expect(scoreDeadCodePercent(40)).toBe(20);
  });

  it('bands unused dependency percent', () => {
    expect(scoreUnusedDependencyPercent(0)).toBe(100);
    expect(scoreUnusedDependencyPercent(3)).toBe(90);
    expect(scoreUnusedDependencyPercent(8)).toBe(75);
    expect(scoreUnusedDependencyPercent(15)).toBe(50);
    expect(scoreUnusedDependencyPercent(30)).toBe(25);
  });

  it('scores secrets findings proportionally', () => {
    expect(scoreSecretsFindings(0)).toBe(100);
    expect(scoreSecretsFindings(1)).toBe(75);
    expect(scoreSecretsFindings(2)).toBe(50);
    expect(scoreSecretsFindings(4)).toBe(0);
  });
});

describe('enterpriseAssessmentFromReport (Carrier strategy)', () => {
  it('keeps section distribution 40 / 35 / 25', () => {
    const result = enterpriseAssessmentFromReport(breakdown, [], { kpi: perfectKpi });
    expect(result.sections.hygiene.weight).toBe(0.4);
    expect(result.sections.security.weight).toBe(0.35);
    expect(result.sections.architecture.weight).toBe(0.25);
  });

  it('applies Carrier hygiene axis weights summing to 40', () => {
    const result = enterpriseAssessmentFromReport(breakdown, [], { kpi: perfectKpi });
    const weights = Object.fromEntries(
      result.sections.hygiene.axes.map((axis) => [axis.id, axis.weight])
    );
    expect(weights).toEqual({
      documentation: 12,
      readme: 10,
      'dead-code': 6,
      'unused-deps': 5,
      'lock-lint': 4,
      'clean-tree': 3,
    });
    expect(result.sections.hygiene.axes.reduce((sum, a) => sum + a.weight, 0)).toBe(40);
  });

  it('applies Carrier security axis weights summing to 35', () => {
    const result = enterpriseAssessmentFromReport(breakdown, [], { kpi: perfectKpi });
    const weights = Object.fromEntries(
      result.sections.security.axes.map((axis) => [axis.id, axis.weight])
    );
    expect(weights).toEqual({
      secrets: 9,
      vulnerable: 8,
      approved: 7,
      'api-risk': 5,
      outdated: 4,
      license: 2,
    });
    expect(result.sections.security.axes.reduce((sum, a) => sum + a.weight, 0)).toBe(35);
  });

  it('applies Carrier architecture axis weights summing to 25', () => {
    const result = enterpriseAssessmentFromReport(breakdown, [], { kpi: perfectKpi });
    const weights = Object.fromEntries(
      result.sections.architecture.axes.map((axis) => [axis.id, axis.weight])
    );
    expect(weights).toEqual({
      complexity: 5,
      coupling: 5,
      maintainability: 4,
      smells: 4,
      duplication: 4,
      cohesion: 3,
    });
    expect(result.sections.architecture.axes.reduce((sum, a) => sum + a.weight, 0)).toBe(25);
  });

  it('aggregates hygiene with Carrier formula / 40', () => {
    const kpi: EnterpriseKpiMeasurements = {
      ...perfectKpi,
      documentationCoverage: 50, // 50 * 12
      readmeQuality: 100, // 100 * 10
      deadCode: 100,
      unusedDependencies: 100,
      lockfileLinting: 100,
      cleanTree: 100,
    };
    const result = enterpriseAssessmentFromReport(breakdown, [], { kpi });
    // (50*12 + 100*10 + 100*6 + 100*5 + 100*4 + 100*3) / 40 = (600+1000+600+500+400+300)/40 = 3400/40 = 85
    expect(result.sections.hygiene.score).toBe(85);
  });

  it('caps overall at 70 when documentation coverage < 40', () => {
    const kpi: EnterpriseKpiMeasurements = {
      ...perfectKpi,
      documentationCoverage: 33,
    };
    const result = enterpriseAssessmentFromReport(breakdown, [], { kpi });
    expect(result.overall).toBeLessThanOrEqual(70);
    expect(result.guardrails.some((note) => note.includes('Documentation coverage'))).toBe(true);
  });

  it('caps overall at 75 when README quality < 40', () => {
    const kpi: EnterpriseKpiMeasurements = {
      ...perfectKpi,
      readmeQuality: 25,
    };
    const result = enterpriseAssessmentFromReport(breakdown, [], { kpi });
    expect(result.overall).toBeLessThanOrEqual(75);
    expect(result.guardrails.some((note) => note.includes('README quality'))).toBe(true);
  });

  it('caps overall at 60 when secrets exposure < 50', () => {
    const kpi: EnterpriseKpiMeasurements = {
      ...perfectKpi,
      secretsExposure: 25,
    };
    const result = enterpriseAssessmentFromReport(breakdown, [], { kpi });
    expect(result.overall).toBeLessThanOrEqual(60);
  });

  it('caps overall at 65 when approved libraries < 50', () => {
    const kpi: EnterpriseKpiMeasurements = {
      ...perfectKpi,
      approvedLibraries: 40,
    };
    const result = enterpriseAssessmentFromReport(breakdown, [], { kpi });
    expect(result.overall).toBeLessThanOrEqual(65);
  });

  it('caps overall at 75 when a critical vulnerability is present', () => {
    const kpi: EnterpriseKpiMeasurements = {
      ...perfectKpi,
      hasCriticalVulnerability: true,
      vulnerableDependencies: 75,
    };
    const result = enterpriseAssessmentFromReport(breakdown, [], { kpi });
    expect(result.overall).toBeLessThanOrEqual(75);
    expect(result.guardrails.some((note) => note.includes('Critical vulnerability'))).toBe(true);
  });

  it('uses legacy smell fallback when kpi is omitted', () => {
    const result = enterpriseAssessmentFromReport(breakdown, ['hardcoded-secret'], {
      hasNodeManifest: true,
      vulnerableScore: 100,
    });
    expect(result.sections.security.axes.find((axis) => axis.id === 'secrets')?.value).toBe(0);
    expect(result.overall).toBeLessThanOrEqual(60);
  });

  it('marks unused deps N/A when measurement is null', () => {
    const kpi: EnterpriseKpiMeasurements = {
      ...perfectKpi,
      unusedDependencies: null,
      approvedLibraries: null,
      outdatedPackages: null,
      vulnerableDependencies: null,
    };
    const result = enterpriseAssessmentFromReport(breakdown, [], { kpi });
    expect(result.sections.hygiene.axes.find((a) => a.id === 'unused-deps')?.status).toBe('na');
    expect(result.sections.security.axes.find((a) => a.id === 'vulnerable')?.status).toBe('na');
    expect(result.sections.hygiene.score).toBe(100);
  });
});
