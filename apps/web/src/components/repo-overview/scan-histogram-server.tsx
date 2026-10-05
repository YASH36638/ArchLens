import type { ScanDto } from '@archlens/shared-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/shared/loading-skeleton';
import { getReportSummaryServer } from '@/lib/api/reports';
import { scanRef } from '@/lib/assessment/scan-ref';
import { ScanHistogram, type ScanHistogramPoint } from './scan-histogram';

interface Props {
  token: string;
  completedScans: ScanDto[];
  defaultBranch: string;
  max?: number;
}

export async function ScanHistogramServer({
  token,
  completedScans,
  defaultBranch,
  max = 12,
}: Props) {
  const candidates = await Promise.all(
    completedScans.slice(0, max).map(async (scan) => {
      try {
        const report = await getReportSummaryServer(token, scan.id);
        const ref = scanRef(scan, defaultBranch);
        const date = new Date(scan.finishedAt ?? scan.createdAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        });
        return {
          label: `${date} · ${ref}`,
          score: Math.round(report.scoreBreakdown.overall),
          ref,
          date,
        } satisfies ScanHistogramPoint;
      } catch {
        return null;
      }
    })
  );

  const points = candidates
    .filter((point): point is ScanHistogramPoint => point !== null)
    .reverse();
  return <ScanHistogram points={points} />;
}

export function ScanHistogramSkeleton() {
  return (
    <Card className="flex h-full flex-col rounded-[14px] border-border bg-card shadow-xs">
      <CardHeader className="space-y-1 p-3 pb-0">
        <CardTitle className="text-[14px] font-bold text-muted-foreground">Score history</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        <Skeleton className="h-[200px] w-full" />
      </CardContent>
    </Card>
  );
}
