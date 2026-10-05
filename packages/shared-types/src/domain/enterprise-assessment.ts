import type { ScoreBreakdown } from './score.js';
import type { EnterpriseKpiMeasurements } from './enterprise-kpi.js';
import {
  coveragePercent,
  scoreApiSecurityFindings,
  scoreApprovedRatio,
  scoreDeadCodePercent,
  scoreOutdatedRatio,
  scoreSecretsFindings,
  scoreUnusedDependencyPercent,
} from './enterprise-kpi.js';

export type AssessmentSectionId = 'hygiene' | 'security' | 'architecture';

export type AssessmentAxisStatus = 'ok' | 'fail' | 'na';

export interface AssessmentAxis {
  id: string;
  label: string;
  weight: number;
  value: number;
  status?: AssessmentAxisStatus;
  measurementNote?: string;
}

export interface AssessmentSection {
  id: AssessmentSectionId;
  title: string;
  weight: number;
  score: number;
  axes: AssessmentAxis[];
  summary: string;
  risks: string[];
}

export interface EnterpriseAssessment {
  overall: number;
  uncappedOverall: number;
  guardrails: string[];
  weakestSectionId: AssessmentSectionId;
  sections: Record<AssessmentSectionId, AssessmentSection>;
}

export interface EnterpriseAssessmentOptions {
  vulnerableScore?: number | null;
  hasNodeManifest?: boolean;
  hasPyManifest?: boolean;
  hasCriticalVulnerability?: boolean;
  /** Preferred path: precomputed Carrier KPI measurements from the analyzer. */
  kpi?: EnterpriseKpiMeasurements;
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function hasKind(kinds: Set<string>, ...needles: string[]): boolean {
  return needles.some((kind) => kinds.has(kind));
}

function binary(kinds: Set<string>, failKinds: readonly string[]): number {
  return hasKind(kinds, ...failKinds) ? 0 : 100;
}

/**
 * Carrier section aggregation: Σ(value × weight) / Σ(measured weights).
 * N/A axes are excluded and weights are renormalized.
 */
function weightedSection(axes: AssessmentAxis[]): number {
  const measured = axes.filter((axis) => axis.status !== 'na');
  const total = measured.reduce((sum, axis) => sum + axis.weight, 0);
  if (total <= 0) return 0;
  const raw = measured.reduce((sum, axis) => sum + axis.value * axis.weight, 0) / total;
  return clampScore(raw);
}

function risksFromAxes(axes: AssessmentAxis[], threshold = 60): string[] {
  return axes
    .filter((axis) => axis.status !== 'na' && axis.value < threshold)
    .sort((a, b) => a.value - b.value)
    .map((axis) => `${axis.label} ${axis.value}`);
}

function measuredAxis(
  id: string,
  label: string,
  weight: number,
  value: number,
  note?: string
): AssessmentAxis {
  return {
    id,
    label,
    weight,
    value: clampScore(value),
    status: value < 60 ? 'fail' : 'ok',
    ...(note ? { measurementNote: note } : {}),
  };
}

function naAxis(id: string, label: string, weight: number, note: string): AssessmentAxis {
  return {
    id,
    label,
    weight,
    value: 0,
    status: 'na',
    measurementNote: note,
  };
}

/**
 * Legacy smell-presence fallback when a scan predates Carrier KPI measurements.
 * Prefer analyzer-produced `options.kpi` for accurate completeness / % scores.
 */
function legacyKpiFromSmells(
  kinds: Set<string>,
  options: EnterpriseAssessmentOptions
): EnterpriseKpiMeasurements {
  const docsHits = [hasKind(kinds, 'missing-readme'), hasKind(kinds, 'missing-docs')].filter(
    Boolean
  ).length;
  const documentationCoverage = clampScore(100 - docsHits * 50);
  const readmeQuality = binary(kinds, ['missing-readme']);
  const deadCode = binary(kinds, ['commented-out-code', 'lazy-class']);
  const hasDepsManifest = Boolean(options.hasNodeManifest || options.hasPyManifest);
  const unusedDependencies = hasDepsManifest ? binary(kinds, ['unused-dependency']) : null;
  const lockfileLinting = clampScore(
    (binary(kinds, ['missing-lockfile']) + binary(kinds, ['missing-linter-config'])) / 2
  );
  const cleanTree = binary(kinds, ['build-artifacts-committed', 'large-binary-file']);
  const secretsExposure = binary(kinds, ['hardcoded-secret']);
  const vulnerableDependencies =
    typeof options.vulnerableScore === 'number' ? options.vulnerableScore : null;
  const approvedLibraries = hasDepsManifest ? binary(kinds, ['unapproved-dependency']) : null;
  const apiSecurityRisk = binary(kinds, ['insecure-api']);
  const outdatedPackages = hasDepsManifest ? binary(kinds, ['unpinned-dependency']) : null;
  const licenseCompliance = binary(kinds, ['missing-license']);

  return {
    documentationCoverage,
    readmeQuality,
    deadCode,
    unusedDependencies,
    lockfileLinting,
    cleanTree,
    secretsExposure,
    vulnerableDependencies,
    hasCriticalVulnerability: Boolean(options.hasCriticalVulnerability),
    approvedLibraries,
    apiSecurityRisk,
    outdatedPackages,
    licenseCompliance,
  };
}

export function enterpriseAssessmentFromReport(
  breakdown: ScoreBreakdown,
  presentSmellKinds: readonly string[] | undefined,
  options: EnterpriseAssessmentOptions = {}
): EnterpriseAssessment {
  const kinds = new Set(presentSmellKinds ?? []);
  const kpi = options.kpi ?? legacyKpiFromSmells(kinds, options);

  // --- Repository Hygiene (weights sum to 40) ---
  const hygieneAxes: AssessmentAxis[] = [
    measuredAxis('documentation', 'Documentation coverage', 12, kpi.documentationCoverage),
    measuredAxis('readme', 'README quality', 10, kpi.readmeQuality),
    measuredAxis('dead-code', 'Dead code', 6, kpi.deadCode),
    kpi.unusedDependencies == null
      ? naAxis('unused-deps', 'Unused dependencies', 5, 'No package manifest — not measured')
      : measuredAxis('unused-deps', 'Unused dependencies', 5, kpi.unusedDependencies),
    measuredAxis('lock-lint', 'Lockfile & linting', 4, kpi.lockfileLinting),
    measuredAxis('clean-tree', 'Clean tree', 3, kpi.cleanTree),
  ];

  // --- Security & Compliance (weights sum to 35) ---
  const securityAxes: AssessmentAxis[] = [
    measuredAxis('secrets', 'Secrets exposure', 9, kpi.secretsExposure),
    kpi.vulnerableDependencies == null
      ? naAxis(
          'vulnerable',
          'Vulnerable dependencies',
          8,
          'No lockfile or OSV lookup unavailable — not measured'
        )
      : measuredAxis('vulnerable', 'Vulnerable dependencies', 8, kpi.vulnerableDependencies),
    kpi.approvedLibraries == null
      ? naAxis('approved', 'Approved libraries', 7, 'No package manifest — not measured')
      : measuredAxis('approved', 'Approved libraries', 7, kpi.approvedLibraries),
    measuredAxis('api-risk', 'API security risk', 5, kpi.apiSecurityRisk),
    kpi.outdatedPackages == null
      ? naAxis('outdated', 'Outdated packages', 4, 'No package manifest — not measured')
      : measuredAxis('outdated', 'Outdated packages', 4, kpi.outdatedPackages),
    measuredAxis('license', 'License compliance', 2, kpi.licenseCompliance),
  ];

  // --- Architecture Health (weights sum to 25; metric math unchanged) ---
  const maintainability = clampScore(
    breakdown.complexity * 0.4 + breakdown.cohesion * 0.3 + breakdown.smells * 0.3
  );

  const architectureAxes: AssessmentAxis[] = [
    measuredAxis('complexity', 'Complexity', 5, breakdown.complexity),
    measuredAxis('coupling', 'Coupling', 5, breakdown.coupling),
    measuredAxis('maintainability', 'Maintainability index', 4, maintainability),
    measuredAxis('smells', 'Code smells', 4, breakdown.smells),
    measuredAxis('duplication', 'Duplication', 4, breakdown.duplication),
    measuredAxis('cohesion', 'Cohesion', 3, breakdown.cohesion),
  ];

  const hygieneScore = weightedSection(hygieneAxes);
  const securityScore = weightedSection(securityAxes);
  const architectureScore = weightedSection(architectureAxes);

  const hygiene: AssessmentSection = {
    id: 'hygiene',
    title: 'Repository hygiene',
    weight: 0.4,
    score: hygieneScore,
    axes: hygieneAxes,
    summary: hygieneSummary(hygieneScore, hygieneAxes),
    risks: risksFromAxes(hygieneAxes),
  };
  const security: AssessmentSection = {
    id: 'security',
    title: 'Security & compliance',
    weight: 0.35,
    score: securityScore,
    axes: securityAxes,
    summary: securitySummary(securityScore, securityAxes, kinds, kpi),
    risks: risksFromAxes(securityAxes),
  };
  const architecture: AssessmentSection = {
    id: 'architecture',
    title: 'Architecture health',
    weight: 0.25,
    score: architectureScore,
    axes: architectureAxes,
    summary: architectureSummary(architectureScore, architectureAxes),
    risks: risksFromAxes(architectureAxes),
  };

  // Overall = Hygiene×0.40 + Security×0.35 + Architecture×0.25
  const uncappedOverall = clampScore(
    hygieneScore * 0.4 + securityScore * 0.35 + architectureScore * 0.25
  );

  const guardrails: string[] = [];
  let overall = uncappedOverall;

  // Carrier quality gates
  if (kpi.documentationCoverage < 40) {
    overall = Math.min(overall, 70);
    guardrails.push('Documentation coverage < 40 caps overall at 70');
  }
  if (kpi.readmeQuality < 40) {
    overall = Math.min(overall, 75);
    guardrails.push('README quality < 40 caps overall at 75');
  }
  if (kpi.secretsExposure < 50) {
    overall = Math.min(overall, 60);
    guardrails.push('Secrets exposure < 50 caps overall at 60');
  }
  if (kpi.approvedLibraries != null && kpi.approvedLibraries < 50) {
    overall = Math.min(overall, 65);
    guardrails.push('Approved libraries < 50 caps overall at 65');
  }
  if (kpi.hasCriticalVulnerability) {
    overall = Math.min(overall, 75);
    guardrails.push('Critical vulnerability found caps overall at 75');
  }

  const sections = { hygiene, security, architecture };
  const weakestSectionId = (Object.values(sections) as AssessmentSection[]).sort(
    (a, b) => a.score - b.score
  )[0]!.id;

  return {
    overall,
    uncappedOverall,
    guardrails,
    weakestSectionId,
    sections,
  };
}

function hygieneSummary(score: number, axes: AssessmentAxis[]): string {
  const weakest = [...axes]
    .filter((axis) => axis.status !== 'na')
    .sort((a, b) => a.value - b.value)[0];
  if (score >= 85) {
    return 'Handoff-ready: documentation, README, and tree hygiene support contractors and AI onboarding.';
  }
  if (weakest && weakest.value < 60) {
    return `Maintainability is limited by ${weakest.label.toLowerCase()} — fix that before scaling contractor work.`;
  }
  return 'Hygiene is mixed. Tighten documentation completeness and dependency inventory so the next handoff is safer.';
}

function securitySummary(
  score: number,
  axes: AssessmentAxis[],
  kinds: Set<string>,
  kpi: EnterpriseKpiMeasurements
): string {
  if (kpi.secretsExposure < 50 || kinds.has('hardcoded-secret')) {
    return 'Committed credentials dominate risk. Rotate secrets and keep overall capped until exposure is cleared.';
  }
  if (kpi.approvedLibraries != null && kpi.approvedLibraries < 50) {
    return 'High-risk or non-approved packages are in the production graph. Replace them before treating this repo as compliant.';
  }
  if (kpi.hasCriticalVulnerability || kinds.has('vulnerable-dependency')) {
    return 'Known CVEs were found in resolved dependencies. Patch or upgrade packages and re-scan.';
  }
  if (kpi.apiSecurityRisk < 60 || kinds.has('insecure-api')) {
    return 'Insecure API usage (eval, wildcard CORS, disabled TLS, or similar) is the compliance hotspot.';
  }
  if (kinds.has('missing-lockfile')) {
    return 'No lockfile means vulnerable and outdated packages cannot be audited — treat as compliance risk.';
  }
  const weakest = [...axes]
    .filter((axis) => axis.status !== 'na')
    .sort((a, b) => a.value - b.value)[0];
  if (score >= 85) {
    return 'No committed secrets or license gaps in this scan. Keep lockfiles and vaulted credentials as policy.';
  }
  if (weakest) {
    return `Compliance pressure is highest on ${weakest.label.toLowerCase()}.`;
  }
  return 'Security posture needs a policy pass before this repo is enterprise-ready.';
}

function architectureSummary(score: number, axes: AssessmentAxis[]): string {
  const weakest = [...axes].sort((a, b) => a.value - b.value)[0];
  if (score >= 85) {
    return 'Structure is sound: coupling, complexity, and duplication support long-term change.';
  }
  if (weakest && weakest.value < 60) {
    return `${weakest.label} is the structural bottleneck for long-term maintainability.`;
  }
  return 'Architecture is acceptable but not the headline risk — hygiene and compliance weigh more.';
}

/** Re-export helpers used by analyzer KPI measurement. */
export {
  coveragePercent,
  scoreDeadCodePercent,
  scoreUnusedDependencyPercent,
  scoreSecretsFindings,
  scoreApiSecurityFindings,
  scoreOutdatedRatio,
  scoreApprovedRatio,
};
