import Link from 'next/link';
import { FolderGit2 } from 'lucide-react';
import type { DashboardSummaryDto, DashboardWeekPointDto } from '@archlens/shared-types';
import { EmptyState } from '@/components/shared/empty-state';
import { formatNumber, formatRelativeDate, formatScore } from '@/lib/utils/format';
import { gradeLabel } from '@/lib/utils/grade';
import { KpiRingCard } from './kpi-ring-card';
import { QualityTrendChart } from './quality-trend-chart';

function coveragePercent(summary: DashboardSummaryDto): number {
  const { count, connectedCount } = summary.projectsScanned;
  if (connectedCount > 0) return (count / connectedCount) * 100;
  return count > 0 ? 100 : 0;
}

function insightSentence(summary: DashboardSummaryDto, coverage: number): string {
  const { portfolioHealth, issuesIdentified, projectsScanned } = summary;
  const health =
    portfolioHealth.score === null
      ? 'Portfolio health is not available yet'
      : `Portfolio average is ${formatScore(portfolioHealth.score)}${
          portfolioHealth.grade
            ? ` (Grade ${portfolioHealth.grade}, ${gradeLabel(portfolioHealth.grade)})`
            : ''
        }`;
  const issues = `${formatNumber(issuesIdentified.count)} issues in latest scans (${formatNumber(
    issuesIdentified.criticalAndMajor
  )} critical or major)`;
  const scans = `${Math.round(coverage)}% of ${projectsScanned.connectedCount} connected ${
    projectsScanned.connectedCount === 1 ? 'repository' : 'repositories'
  } scanned in 30 days`;
  return `${health}. ${issues}. ${scans}.`;
}

function compactDelta(delta: number | null): string | null {
  if (delta === null || Number.isNaN(delta)) return null;
  const rounded = Math.round(delta);
  if (rounded === 0) return '0%';
  return `${rounded > 0 ? '↑' : '↓'} ${Math.abs(rounded)}%`;
}

function activeWeeklyWindow(weekly: DashboardWeekPointDto[]): DashboardWeekPointDto[] {
  if (weekly.length === 0) return weekly;
  const firstActive = weekly.findIndex(
    (point) => point.scanCount > 0 || point.avgScore !== null || point.avgSmells !== null
  );
  if (firstActive <= 0) return weekly;
  return weekly.slice(firstActive);
}

export function DashboardView({ summary }: { summary: DashboardSummaryDto }) {
  if (!summary.hasCompletedScans) {
    return (
      <EmptyState
        icon={FolderGit2}
        title="No scans yet"
        description="Connect a repository and run a scan to see portfolio health, issues, and quality trends."
        actionLabel="Go to Projects"
        actionHref="/projects"
        testId="dashboard-empty"
      />
    );
  }

  const { projectsScanned, issuesIdentified, portfolioHealth } = summary;
  const coverage = coveragePercent(summary);
  const chartWeekly = activeWeeklyWindow(summary.weekly);

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-x-hidden"
      data-testid="dashboard-insights"
    >
      <div className="grid shrink-0 gap-3 pt-2 md:grid-cols-3">
        <KpiRingCard
          title="Portfolio health"
          value={portfolioHealth.score === null ? '—' : formatScore(portfolioHealth.score)}
          caption="Average quality across the portfolio"
          ringPercent={portfolioHealth.score}
          tone="success"
          delta={compactDelta(portfolioHealth.deltaPercent)}
        />
        <KpiRingCard
          title="Issues identified"
          value={formatNumber(issuesIdentified.count)}
          caption="Findings from latest completed scans"
          ringPercent={null}
          tone="warning"
          delta={compactDelta(issuesIdentified.deltaPercent)}
        />
        <KpiRingCard
          title="Scan coverage"
          value={`${Math.round(coverage)}%`}
          caption="Connected repositories scanned recently"
          ringPercent={coverage}
          tone="system"
          delta={compactDelta(projectsScanned.deltaPercent)}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-card shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#0F172A] px-4 py-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.06em] text-slate-300">
              Quality score and issue burden
            </h2>
            {summary.lastUpdatedAt ? (
              <span className="text-[12px] text-slate-400">
                updated {formatRelativeDate(summary.lastUpdatedAt)}
              </span>
            ) : null}
          </div>
          <div
            className="flex shrink-0 items-center gap-3 text-[12px] text-slate-400"
            aria-label="Chart legend"
          >
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#4F8CFF]" /> Average score
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#F59E0B]/75" /> Average issues
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 px-3 py-3 sm:px-4">
          <QualityTrendChart weekly={chartWeekly} />
        </div>
      </div>

      <p className="shrink-0 text-body text-muted-foreground">
        {insightSentence(summary, coverage)}{' '}
        <Link
          href="/projects"
          className="font-medium text-[#4F8CFF] underline-offset-4 hover:underline"
        >
          Review projects
        </Link>
      </p>
    </div>
  );
}
