import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArchitectureWorkbench } from '@/components/architecture/architecture-workbench';
import { getSessionToken } from '@/lib/auth/server';
import { ApiError } from '@/lib/api/client';
import { latestCompletedScan, loadRepoContext } from '@/lib/api/repo-loader';
import { getArchitectureServer } from '@/lib/api/architecture';
import { getReportSummaryServer, listReportModulesServer } from '@/lib/api/reports';

interface PageProps {
  params: { owner: string; name: string };
}

export default async function ArchitecturePage({ params }: PageProps) {
  const token = await getSessionToken();
  if (!token) redirect('/login');

  try {
    const ctx = await loadRepoContext(token, params.owner, params.name);
    if (!ctx) notFound();

    const completed = latestCompletedScan(ctx.scans);
    if (!completed) {
      return (
        <Card data-testid="architecture-empty">
          <CardHeader>
            <CardTitle>No completed scan yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Run a scan to explore this repository&apos;s file structure.
            </p>
          </CardContent>
        </Card>
      );
    }

    const [architecture, modules, summary] = await Promise.all([
      getArchitectureServer(token, completed.id),
      listReportModulesServer(token, completed.id),
      getReportSummaryServer(token, completed.id),
    ]);

    return (
      <div className="flex h-full min-h-0 flex-col" data-testid="architecture-page">
        <ArchitectureWorkbench
          architecture={architecture}
          modules={modules}
          smells={summary.topSmells ?? []}
        />
      </div>
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect('/login?reauth=1');
    throw e;
  }
}
