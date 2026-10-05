import type { Grade } from '@archlens/ir-schema';

export interface DashboardProjectsKpiDto {
  /** Distinct repos with a completed scan in the last 30 days. */
  count: number;
  /** Same metric for the prior 30-day window. */
  previousCount: number;
  /** Percent change vs the prior window. Null when there is no baseline. */
  deltaPercent: number | null;
  /** Connected repos for this user (denominator for the ring). */
  connectedCount: number;
}

export interface DashboardIssuesKpiDto {
  /** Sum of smellsCount on the latest completed report per repo. */
  count: number;
  /** Sum of smellsCount on the previous completed report per repo. */
  previousCount: number;
  /** Percent change vs previous reports. Down is an improvement. */
  deltaPercent: number | null;
  /** Critical + major smells on those latest reports. */
  criticalAndMajor: number;
}

export interface DashboardHealthKpiDto {
  /** Average latest overallScore across repos that have a completed report. */
  score: number | null;
  /** Average previous overallScore for the same repos (where a prior report exists). */
  previousScore: number | null;
  /** Percent change vs previous average. Null when no baseline. */
  deltaPercent: number | null;
  /** Letter grade for the current average, using the scoring engine bands. */
  grade: Grade | null;
  /** Repos included in the average. */
  repoCount: number;
}

export interface DashboardWeekPointDto {
  /** Monday 00:00 UTC of the ISO week. */
  weekStart: string;
  /** Short axis label, e.g. "Jan 6". */
  label: string;
  /** Average overallScore of completed reports generated that week. */
  avgScore: number | null;
  /** Average smellsCount of those same reports. */
  avgSmells: number | null;
  scanCount: number;
}

export interface DashboardSummaryDto {
  hasCompletedScans: boolean;
  lastUpdatedAt: string | null;
  projectsScanned: DashboardProjectsKpiDto;
  issuesIdentified: DashboardIssuesKpiDto;
  portfolioHealth: DashboardHealthKpiDto;
  weekly: DashboardWeekPointDto[];
}
