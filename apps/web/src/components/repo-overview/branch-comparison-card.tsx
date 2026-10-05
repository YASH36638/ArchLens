'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createScan } from '@/lib/api/scans';
import { ApiError } from '@/lib/api/client';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useRepoMeta } from '@/hooks/use-repo-meta';
import { useScanProgress } from '@/hooks/use-scan-progress';
import { cn } from '@/lib/utils/cn';
import { formatRelativeDate } from '@/lib/utils/format';

export interface BranchScanRecency {
  ref: string;
  scannedAt: string | null;
}

interface BranchInformationCardProps {
  repoId: string;
  defaultBranch: string;
  /** Branch refs ordered by most recent completed scan first. */
  branchRecency: BranchScanRecency[];
}

export function BranchInformationCard({
  repoId,
  defaultBranch,
  branchRecency,
}: BranchInformationCardProps) {
  return (
    <Card className="flex h-full min-h-0 flex-col" data-testid="branch-information">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-[15px] font-semibold text-foreground">
          Branch information
        </CardTitle>
        <CardDescription className="text-[14px] leading-5 text-muted-foreground">
          Latest activity first — scan a branch to refresh its score
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col p-4 pt-0">
        <BranchScanList
          repoId={repoId}
          defaultBranch={defaultBranch}
          branchRecency={branchRecency}
          className="min-h-0 flex-1"
        />
      </CardContent>
    </Card>
  );
}

/** @deprecated Use BranchInformationCard */
export const BranchComparisonCard = BranchInformationCard;

function BranchScanList({
  repoId,
  defaultBranch,
  branchRecency,
  className,
}: {
  repoId: string;
  defaultBranch: string;
  branchRecency: BranchScanRecency[];
  className?: string;
}) {
  const token = useAuthToken();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { meta, loading, error } = useRepoMeta(repoId, true);
  const [pendingRef, setPendingRef] = useState<string | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const progress = useScanProgress(scanId, {
    onCompleted: () => {
      setPendingRef(null);
      setScanId(null);
      void queryClient.invalidateQueries();
      router.refresh();
    },
    onFailed: () => {
      setPendingRef(null);
      setScanId(null);
    },
  });

  const scannedAtByRef = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const entry of branchRecency) {
      map.set(entry.ref, entry.scannedAt);
    }
    return map;
  }, [branchRecency]);

  const branches = meta?.branches?.length ? meta.branches : [defaultBranch];

  const sortedBranches = useMemo(() => {
    return [...branches].sort((a, b) => {
      const aAt = scannedAtByRef.get(a);
      const bAt = scannedAtByRef.get(b);
      const aTime = aAt ? new Date(aAt).getTime() : Number.NEGATIVE_INFINITY;
      const bTime = bAt ? new Date(bAt).getTime() : Number.NEGATIVE_INFINITY;
      if (aTime !== bTime) return bTime - aTime;
      if (a === defaultBranch) return -1;
      if (b === defaultBranch) return 1;
      return a.localeCompare(b);
    });
  }, [branches, defaultBranch, scannedAtByRef]);

  async function scanBranch(branch: string) {
    if (!token) {
      setSubmitError('Not signed in');
      return;
    }
    setPendingRef(branch);
    setSubmitError(null);
    try {
      const scan = await createScan(token, repoId, branch);
      setScanId(scan.id);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError
          ? `Failed to enqueue scan: ${err.status} ${err.statusText}`
          : err instanceof Error
            ? err.message
            : 'Failed to enqueue scan'
      );
      setPendingRef(null);
    }
  }

  const isRunning =
    pendingRef !== null &&
    progress.status !== 'completed' &&
    progress.status !== 'failed' &&
    progress.status !== 'error';

  const scannedCount = sortedBranches.filter((branch) => scannedAtByRef.has(branch)).length;

  return (
    <div className={cn('flex min-h-0 flex-col', className)} data-testid="branch-scan-list">
      <p className="mb-2 text-[14px] leading-5 text-muted-foreground">
        <span className="font-medium text-foreground">{branches.length}</span>{' '}
        {branches.length === 1 ? 'branch' : 'branches'}
        {scannedCount > 0 ? ` · ${scannedCount} scanned` : null}
      </p>
      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading branches…
        </p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <ul className="max-h-[220px] min-h-0 flex-1 space-y-1.5 overflow-y-auto">
          {sortedBranches.map((branch) => {
            const scannedAt = scannedAtByRef.get(branch);
            const done = scannedAtByRef.has(branch);
            const scanning = pendingRef === branch && isRunning;
            return (
              <li
                key={branch}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/80 bg-muted/30 px-3 py-1.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {branch}
                    {branch === defaultBranch ? (
                      <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">
                        default
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[14px] text-muted-foreground">
                    {done && scannedAt
                      ? `Scanned ${formatRelativeDate(scannedAt)}`
                      : done
                        ? 'Scanned'
                        : scanning
                          ? 'Scanning…'
                          : 'Not scanned'}
                  </p>
                </div>
                {done ? (
                  <span className="inline-flex items-center gap-1 text-[14px] font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Done
                  </span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={
                      scanning || (pendingRef !== null && pendingRef !== branch && isRunning)
                    }
                    onClick={() => void scanBranch(branch)}
                  >
                    {scanning ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                    Scan
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {submitError ? <p className="mt-2 text-[14px] text-destructive">{submitError}</p> : null}
      {scanId && progress.status !== 'idle' ? (
        <p
          className={cn(
            'mt-2 text-[14px]',
            progress.status === 'failed' || progress.status === 'error'
              ? 'text-destructive'
              : 'text-muted-foreground'
          )}
        >
          {progress.step ?? progress.status}
          {progress.percent ? ` · ${progress.percent}%` : ''}
        </p>
      ) : null}
    </div>
  );
}
