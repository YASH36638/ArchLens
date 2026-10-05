import type { RepositoryDto, ScanDto } from '@archlens/shared-types';
import type { DashboardRepoSnapshot } from '@/lib/assessment/recommendations';
import { ApiError } from '@/lib/api/client';
import { listReposServer } from '@/lib/api/repos';
import { listScansServer } from '@/lib/api/scans';
import { getReportSummaryServer } from '@/lib/api/reports';

export type ProjectsLoadResult =
  | { kind: 'ok'; repos: DashboardRepoSnapshot[] }
  | { kind: 'error'; message: string };

export async function loadProjectSnapshots(token: string): Promise<ProjectsLoadResult> {
  let repos: RepositoryDto[];
  let allScans: ScanDto[];
  try {
    [repos, allScans] = await Promise.all([
      listReposServer(token),
      listScansServer(token).catch(() => [] as ScanDto[]),
    ]);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) throw e;
    return {
      kind: 'error',
      message:
        e instanceof ApiError
          ? `API ${e.status}: ${e.statusText}`
          : e instanceof Error
            ? e.message
            : 'Unknown error',
    };
  }

  const scansByRepo = new Map<string, ScanDto[]>();
  for (const s of allScans) {
    const list = scansByRepo.get(s.repoId);
    if (list) list.push(s);
    else scansByRepo.set(s.repoId, [s]);
  }

  const snapshots = await Promise.all(
    repos.map(async (repo): Promise<DashboardRepoSnapshot> => {
      const scans = scansByRepo.get(repo.id) ?? [];
      const latest = scans
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      const base: DashboardRepoSnapshot = {
        id: repo.id,
        fullName: repo.fullName,
        owner: repo.owner,
        name: repo.name,
        private: repo.private,
        defaultBranch: repo.defaultBranch,
        scanId: latest?.id ?? null,
        scanStatus: latest?.status ?? null,
        overall: null,
        breakdown: null,
        counts: null,
        topSmellKinds: [],
        updatedAt: latest?.finishedAt ?? latest?.startedAt ?? latest?.createdAt ?? null,
      };

      if (!latest || latest.status !== 'completed' || !latest.reportId) {
        return base;
      }

      try {
        const summary = await getReportSummaryServer(token, latest.id);
        return {
          ...base,
          overall: summary.scoreBreakdown.overall,
          breakdown: summary.scoreBreakdown,
          counts: summary.counts,
          topSmellKinds: (summary.topSmells ?? []).slice(0, 5).map((s) => s.kind),
          updatedAt: latest.finishedAt ?? latest.createdAt,
        };
      } catch {
        return base;
      }
    })
  );

  return {
    kind: 'ok',
    repos: snapshots.slice().sort((a, b) => {
      if (a.overall === null && b.overall === null) {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bTime - aTime;
      }
      if (a.overall === null) return 1;
      if (b.overall === null) return -1;
      if (b.overall !== a.overall) return b.overall - a.overall;
      return a.fullName.localeCompare(b.fullName);
    }),
  };
}
