/**
 * Carrier Repository Quality Scoring — KPI measurement contracts and
 * normalization helpers. Axis weights stay under enterprise-assessment.ts;
 * section distribution remains Hygiene 40 / Security 35 / Architecture 25.
 */

export interface EnterpriseKpiMeasurements {
  /** Documentation category coverage % (0–100). */
  documentationCoverage: number;
  /** README required-section completeness % (0–100). */
  readmeQuality: number;
  /** Dead-code score after band normalization (0–100). */
  deadCode: number;
  /** Unused-deps score after band normalization (0–100), or null when N/A. */
  unusedDependencies: number | null;
  /** Lockfile (50) + lint config (50). */
  lockfileLinting: number;
  /** Clean-tree score after penalties (0–100). */
  cleanTree: number;
  /** Secrets exposure score (0–100). */
  secretsExposure: number;
  /** OSV / vulnerability score (0–100), or null when N/A. */
  vulnerableDependencies: number | null;
  /** True when at least one critical CVE was found. */
  hasCriticalVulnerability: boolean;
  /** Approved-library % score (0–100), or null when N/A. */
  approvedLibraries: number | null;
  /** API security score (0–100). */
  apiSecurityRisk: number;
  /** Outdated-package score (0–100), or null when N/A. */
  outdatedPackages: number | null;
  /** License compliance score (0–100). */
  licenseCompliance: number;
}

export const DOC_CATEGORIES = [
  'architecture',
  'api',
  'setup',
  'deployment',
  'troubleshooting',
  'runbook',
] as const;

export type DocCategory = (typeof DOC_CATEGORIES)[number];

export const README_SECTIONS = [
  'overview',
  'installation',
  'configuration',
  'usage',
  'architecture',
  'deployment',
  'ownership',
  'troubleshooting',
] as const;

export type ReadmeSection = (typeof README_SECTIONS)[number];

/** Dead code % → score bands (Carrier strategy). */
export function scoreDeadCodePercent(deadCodePercent: number): number {
  const pct = Math.max(0, deadCodePercent);
  if (pct <= 5) return 100;
  if (pct <= 10) return 85;
  if (pct <= 20) return 70;
  if (pct <= 30) return 50;
  return 20;
}

/** Unused dependency % → score bands. */
export function scoreUnusedDependencyPercent(unusedPercent: number): number {
  const pct = Math.max(0, unusedPercent);
  if (pct <= 0) return 100;
  if (pct < 5) return 90;
  if (pct < 10) return 75;
  if (pct < 20) return 50;
  return 25;
}

/** Secrets finding count → proportional score (0 findings = 100). */
export function scoreSecretsFindings(count: number): number {
  if (count <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round(100 - count * 25)));
}

/** Insecure-API finding count → proportional score. */
export function scoreApiSecurityFindings(count: number): number {
  if (count <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round(100 - count * 20)));
}

/** Outdated ratio (0–1) → 0–100 score. */
export function scoreOutdatedRatio(outdatedRatio: number): number {
  const ratio = Math.max(0, Math.min(1, outdatedRatio));
  return Math.max(0, Math.min(100, Math.round(100 * (1 - ratio))));
}

/** Approved ratio (0–1) → 0–100 score. */
export function scoreApprovedRatio(approvedRatio: number): number {
  const ratio = Math.max(0, Math.min(1, approvedRatio));
  return Math.max(0, Math.min(100, Math.round(100 * ratio)));
}

export function coveragePercent(present: number, required: number): number {
  if (required <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((present / required) * 100)));
}
