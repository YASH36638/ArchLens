import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import type { ReportCycleDto, ReportSummaryDto, ScanDto } from '@archlens/shared-types';
import { ApiError } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSessionToken } from '@/lib/auth/server';
import { loadRepoContext } from '@/lib/api/repo-loader';
import { getReportSummaryServer } from '@/lib/api/reports';
import { ScoreCard } from '@/components/score/score-card';
import { SectionRadarCard } from '@/components/repo-overview/section-radar-card';
import { enterpriseAssessmentFromReport } from '@archlens/shared-types';
import {
  BranchInformationCard,
  type BranchScanRecency,
} from '@/components/repo-overview/branch-comparison-card';
import {
  ScanHistogramServer,
  ScanHistogramSkeleton,
} from '@/components/repo-overview/scan-histogram-server';
import { latestCompletedScanByRef, scanRef } from '@/lib/assessment/scan-ref';
import { scoreNeedsAttention, SECTION_ATTENTION_THRESHOLD } from '@/lib/utils/grade';

interface PageProps {
  params: { owner: string; name: string };
}

interface RepoOverviewData {
  token: string;
  repoId: string;
  defaultBranch: string;
  scanId: string | null;
  summary: ReportSummaryDto | null;
  completedScans: ScanDto[];
  latestScan: ScanDto | null;
  branchRecency: BranchScanRecency[];
}

function buildBranchRecency(
  completedScans: ScanDto[],
  defaultBranch: string
): BranchScanRecency[] {
  const latest = latestCompletedScanByRef(completedScans, defaultBranch);
  return [...latest.entries()]
    .map(([ref, scan]) => ({
      ref,
      scannedAt: scan.finishedAt ?? scan.createdAt ?? null,
    }))
    .sort((a, b) => {
      const aTime = a.scannedAt ? new Date(a.scannedAt).getTime() : 0;
      const bTime = b.scannedAt ? new Date(b.scannedAt).getTime() : 0;
      return bTime - aTime;
    });
}

async function loadRepoOverview(
  token: string,
  owner: string,
  name: string
): Promise<RepoOverviewData | 'not-found'> {
  const ctx = await loadRepoContext(token, owner, name);
  if (!ctx) return 'not-found';

  const completed = ctx.scans.filter((s) => s.status === 'completed');
  const latestScan = ctx.scans[0] ?? null;
  const latestCompleted = completed[0] ?? null;
  const defaultBranch = ctx.repo.defaultBranch;
  const branchRecency = buildBranchRecency(completed, defaultBranch);

  if (!latestCompleted) {
    return {
      token,
      repoId: ctx.repo.id,
      defaultBranch,
      scanId: null,
      summary: null,
      completedScans: [],
      latestScan,
      branchRecency,
    };
  }

  const summary = await getReportSummaryServer(token, latestCompleted.id);

  return {
    token,
    repoId: ctx.repo.id,
    defaultBranch,
    scanId: latestCompleted.id,
    summary,
    completedScans: completed,
    latestScan,
    branchRecency,
  };
}

export default async function RepoOverviewPage({ params }: PageProps) {
  const token = await getSessionToken();
  if (!token) redirect('/login');

  let data: Awaited<ReturnType<typeof loadRepoOverview>>;
  try {
    data = await loadRepoOverview(token, params.owner, params.name);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect('/login?reauth=1');
    throw e;
  }
  if (data === 'not-found') notFound();

  const {
    token: serverToken,
    repoId,
    defaultBranch,
    scanId,
    summary,
    completedScans,
    latestScan,
    branchRecency,
  } = data;

  if (!summary) {
    return (
      <div className="space-y-3" data-testid="repo-overview-empty">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>No completed scan yet</CardTitle>
            </CardHeader>
            <CardContent>
              {latestScan ? (
                <p className="text-[15px] leading-6 text-muted-foreground">
                  The most recent scan is currently <strong>{latestScan.status}</strong>
                  {latestScan.ref ? (
                    <>
                      {' '}
                      on <strong>{scanRef(latestScan, defaultBranch)}</strong>
                    </>
                  ) : null}
                  .
                </p>
              ) : (
                <p className="text-[15px] leading-6 text-muted-foreground">
                  Click <strong>Re-scan</strong> in the toolbar, or scan a branch on the right, to
                  generate the first report.
                </p>
              )}
            </CardContent>
          </Card>
          <BranchInformationCard
            repoId={repoId}
            defaultBranch={defaultBranch}
            branchRecency={branchRecency}
          />
        </div>
      </div>
    );
  }

  if (!scanId) {
    throw new Error('A report summary requires a completed scan.');
  }

  const sb = summary.scoreBreakdown;
  const assessment =
    summary.enterpriseAssessment ??
    enterpriseAssessmentFromReport(sb, summary.presentSmellKinds ?? []);
  const { hygiene, security, architecture } = assessment.sections;
  const lowest = assessment.sections[assessment.weakestSectionId];
  const lowestNeedsAttention = scoreNeedsAttention(lowest.score);

  return (
    <div data-testid="repo-overview" className="space-y-3">
      <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 xl:grid-cols-[minmax(13rem,0.85fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <ScoreCard
          score={assessment.overall}
          subtitle={
            assessment.guardrails[0] ??
            `Hygiene ${hygiene.score} · Security ${security.score} · Architecture ${architecture.score}`
          }
        />
        <SectionRadarCard
          section={hygiene}
          color="hsl(var(--success))"
          weakest={assessment.weakestSectionId === 'hygiene' && scoreNeedsAttention(hygiene.score)}
        />
        <SectionRadarCard
          section={security}
          color="hsl(var(--risk))"
          weakest={
            assessment.weakestSectionId === 'security' && scoreNeedsAttention(security.score)
          }
        />
        <SectionRadarCard
          section={architecture}
          color="hsl(var(--primary))"
          weakest={
            assessment.weakestSectionId === 'architecture' &&
            scoreNeedsAttention(architecture.score)
          }
        />
      </div>

      <p className="text-body text-muted-foreground">
        {lowestNeedsAttention
          ? `${lowest.title} needs attention at ${lowest.score} — scores below ${SECTION_ATTENTION_THRESHOLD} are Poor or Critical. `
          : `No section is below ${SECTION_ATTENTION_THRESHOLD}. Lowest is ${lowest.title} at ${lowest.score}. `}
        {assessment.guardrails[0] ??
          (lowestNeedsAttention
            ? 'Inspect that section, review branches, or re-scan.'
            : 'Review branches or re-scan to track change.')}
      </p>

      <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-2">
        <Suspense fallback={<ScanHistogramSkeleton />}>
          <ScanHistogramServer
            token={serverToken}
            completedScans={completedScans}
            defaultBranch={defaultBranch}
          />
        </Suspense>
        <BranchInformationCard
          repoId={repoId}
          defaultBranch={defaultBranch}
          branchRecency={branchRecency}
        />
      </div>

      {summary.cycles && summary.cycles.length > 0 ? (
        <details className="space-y-2" data-testid="dependency-cycles" open>
          <summary className="cursor-pointer text-section-title tracking-tight text-foreground">
            Dependency cycles
            <span className="ml-2 text-body font-normal text-muted-foreground">
              {summary.cycles.length} circular {summary.cycles.length === 1 ? 'chain' : 'chains'}
            </span>
          </summary>
          <Card className="p-4">
            <div className="mb-3 text-body leading-6 text-muted-foreground">
              {summary.cycles.length} circular dependency
              {summary.cycles.length === 1 ? '' : ' chains'} detected. Each cycle penalises the
              coupling score by 15 points.
            </div>
            <ul className="space-y-2.5 text-body">
              {summary.cycles.map((c, i) => (
                <CycleEntry key={i} index={i} cycle={c} />
              ))}
            </ul>
          </Card>
        </details>
      ) : null}
    </div>
  );
}

function CycleEntry({ index, cycle }: { index: number; cycle: ReportCycleDto }) {
  // Prefer the real shortest path; fall back to the SCC nodes for old reports
  // that predate the representativePath enrichment. Either way, never join
  // arbitrary node lists with " → " — that's the bug this is meant to fix.
  const pathNames = cycle.representativePathNames;
  const edges = cycle.edges ?? [];
  const sccSize = cycle.moduleNames.length;
  const showMembers = sccSize > 2 && pathNames && pathNames.length - 1 < sccSize;
  const pathEdgeKey = (from: string, to: string) => `${from} ${to}`;
  const pathEdgeKeys = new Set<string>();
  if (pathNames) {
    for (let i = 0; i < pathNames.length - 1; i++) {
      pathEdgeKeys.add(pathEdgeKey(pathNames[i]!, pathNames[i + 1]!));
    }
  }
  const supportingEdges = edges
    .map((e) => ({ ...e, key: pathEdgeKey(e.fromName, e.toName) }))
    .filter((e) => !pathEdgeKeys.has(e.key));
  return (
    <li
      className="rounded border bg-background p-3"
      data-testid="dependency-cycle"
      data-cycle-index={index}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-risk/10 px-2 py-0.5 text-metadata font-semibold text-risk">
          cycle {index + 1}
        </span>
        {pathNames ? (
          <span className="font-mono text-[15px]" data-testid="cycle-path">
            {pathNames.join(' → ')}
          </span>
        ) : (
          <span className="font-mono text-[15px] text-muted-foreground">
            {cycle.moduleNames.join(', ')}
          </span>
        )}
      </div>
      {showMembers ? (
        <p className="mt-2 text-[14px] leading-5 text-muted-foreground">
          Part of a larger {sccSize}-module strongly-connected component:{' '}
          <span className="font-mono">{cycle.moduleNames.join(', ')}</span>
        </p>
      ) : null}
      {supportingEdges.length > 0 ? (
        <details className="mt-2 text-[14px]" data-testid="cycle-edges">
          <summary className="cursor-pointer text-muted-foreground">
            {supportingEdges.length} additional edge{supportingEdges.length === 1 ? '' : 's'}{' '}
            connecting these modules
          </summary>
          <ul className="mt-1 grid grid-cols-1 gap-0.5 font-mono sm:grid-cols-2">
            {supportingEdges.map((e) => (
              <li key={e.key}>
                {e.fromName} → {e.toName}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </li>
  );
}
