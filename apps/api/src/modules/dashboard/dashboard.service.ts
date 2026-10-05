import { Injectable } from '@nestjs/common';
import type { Grade } from '@archlens/ir-schema';
import type { DashboardSummaryDto } from '@archlens/shared-types';
import { PrismaService } from '../../database/prisma.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_COUNT = 12;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string): Promise<DashboardSummaryDto> {
    const now = new Date();
    const currentWindowStart = new Date(now.getTime() - 30 * DAY_MS);
    const priorWindowStart = new Date(now.getTime() - 60 * DAY_MS);
    const chartStart = startOfIsoWeekUtc(addDaysUtc(startOfIsoWeekUtc(now), -7 * (WEEK_COUNT - 1)));

    const [connectedCount, currentScanned, priorScanned, reports, weeklyReports] =
      await Promise.all([
        this.prisma.repository.count({ where: { userId } }),
        this.distinctCompletedRepos(userId, currentWindowStart, now),
        this.distinctCompletedRepos(userId, priorWindowStart, currentWindowStart),
        this.prisma.report.findMany({
          where: {
            scan: { status: 'completed', repository: { userId } },
          },
          orderBy: [{ generatedAt: 'desc' }, { id: 'desc' }],
          select: {
            id: true,
            repoId: true,
            overallScore: true,
            smellsCount: true,
            generatedAt: true,
          },
        }),
        this.prisma.report.findMany({
          where: {
            generatedAt: { gte: chartStart },
            scan: { status: 'completed', repository: { userId } },
          },
          select: {
            overallScore: true,
            smellsCount: true,
            generatedAt: true,
          },
        }),
      ]);

    const latestByRepo = new Map<string, (typeof reports)[number]>();
    const previousByRepo = new Map<string, (typeof reports)[number]>();
    for (const report of reports) {
      if (!latestByRepo.has(report.repoId)) {
        latestByRepo.set(report.repoId, report);
        continue;
      }
      if (!previousByRepo.has(report.repoId)) {
        previousByRepo.set(report.repoId, report);
      }
    }

    const latestReports = [...latestByRepo.values()];
    const issuesCount = latestReports.reduce((sum, r) => sum + r.smellsCount, 0);
    const previousIssuesCount = [...previousByRepo.values()].reduce(
      (sum, r) => sum + r.smellsCount,
      0
    );

    const latestIds = latestReports.map((r) => r.id);
    const criticalAndMajor =
      latestIds.length === 0
        ? 0
        : await this.prisma.smell.count({
            where: {
              reportId: { in: latestIds },
              severity: { in: ['critical', 'major'] },
            },
          });

    const healthScores = latestReports.map((r) => r.overallScore);
    const previousHealthScores = [...previousByRepo.values()].map((r) => r.overallScore);
    const healthScore = average(healthScores);
    const previousHealthScore = average(previousHealthScores);

    const lastUpdatedAt =
      latestReports.length === 0
        ? null
        : latestReports.reduce(
            (max, r) => (r.generatedAt > max ? r.generatedAt : max),
            latestReports[0].generatedAt
          );

    return {
      hasCompletedScans: latestReports.length > 0,
      lastUpdatedAt: lastUpdatedAt?.toISOString() ?? null,
      projectsScanned: {
        count: currentScanned,
        previousCount: priorScanned,
        deltaPercent: percentChange(currentScanned, priorScanned),
        connectedCount,
      },
      issuesIdentified: {
        count: issuesCount,
        previousCount: previousIssuesCount,
        deltaPercent:
          previousByRepo.size > 0 ? percentChange(issuesCount, previousIssuesCount) : null,
        criticalAndMajor,
      },
      portfolioHealth: {
        score: healthScore,
        previousScore: previousHealthScore,
        deltaPercent:
          previousHealthScore === null
            ? null
            : percentChange(healthScore ?? 0, previousHealthScore),
        grade: healthScore === null ? null : scoreToGrade(healthScore),
        repoCount: healthScores.length,
      },
      weekly: buildWeeklySeries(weeklyReports, chartStart, WEEK_COUNT),
    };
  }

  private async distinctCompletedRepos(userId: string, from: Date, to: Date): Promise<number> {
    const rows = await this.prisma.scan.findMany({
      where: {
        status: 'completed',
        finishedAt: { gte: from, lt: to },
        repository: { userId },
      },
      distinct: ['repoId'],
      select: { repoId: true },
    });
    return rows.length;
  }
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function percentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function scoreToGrade(score: number): Grade {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'E';
}

function startOfIsoWeekUtc(date: Date): Date {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + diff);
  utc.setUTCHours(0, 0, 0, 0);
  return utc;
}

function addDaysUtc(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function buildWeeklySeries(
  reports: Array<{ overallScore: number; smellsCount: number; generatedAt: Date }>,
  firstWeekStart: Date,
  weekCount: number
): DashboardSummaryDto['weekly'] {
  const buckets = new Map<number, { scoreSum: number; smellSum: number; count: number }>();
  for (const report of reports) {
    const key = startOfIsoWeekUtc(report.generatedAt).getTime();
    const bucket = buckets.get(key) ?? { scoreSum: 0, smellSum: 0, count: 0 };
    bucket.scoreSum += report.overallScore;
    bucket.smellSum += report.smellsCount;
    bucket.count += 1;
    buckets.set(key, bucket);
  }

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const series: DashboardSummaryDto['weekly'] = [];
  for (let i = 0; i < weekCount; i += 1) {
    const weekStart = addDaysUtc(firstWeekStart, i * 7);
    const bucket = buckets.get(weekStart.getTime());
    series.push({
      weekStart: weekStart.toISOString(),
      label: `${months[weekStart.getUTCMonth()]} ${weekStart.getUTCDate()}`,
      avgScore: bucket && bucket.count > 0 ? bucket.scoreSum / bucket.count : null,
      avgSmells: bucket && bucket.count > 0 ? bucket.smellSum / bucket.count : null,
      scanCount: bucket?.count ?? 0,
    });
  }
  return series;
}
