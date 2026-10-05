'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createScan } from '@/lib/api/scans';
import { ApiError } from '@/lib/api/client';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useScanProgress } from '@/hooks/use-scan-progress';
import { cn } from '@/lib/utils/cn';

interface Props {
  repoId: string;
}

export function RescanButton({ repoId }: Props) {
  const token = useAuthToken();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [scanId, setScanId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const progress = useScanProgress(scanId, {
    onCompleted: () => {
      void queryClient.invalidateQueries();
      router.refresh();
    },
  });

  async function handleClick() {
    if (!token) {
      setSubmitError('Not signed in');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const scan = await createScan(token, repoId);
      setScanId(scan.id);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError
          ? `Failed to enqueue scan: ${err.status} ${err.statusText}`
          : err instanceof Error
            ? err.message
            : 'Failed to enqueue scan'
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isRunning =
    submitting ||
    progress.status === 'connecting' ||
    progress.status === 'subscribed' ||
    (scanId !== null && progress.status !== 'completed' && progress.status !== 'failed');

  const showProgress = scanId !== null && progress.status !== 'idle';
  const isFailed = progress.status === 'failed' || progress.status === 'error';
  const pct = Math.max(0, Math.min(100, progress.percent));

  return (
    <div className="flex items-center gap-2" data-testid="rescan-controls">
      {showProgress ? (
        <span className="hidden max-w-[220px] truncate text-metadata text-muted-foreground sm:inline">
          <span data-testid="scan-progress-step">
            {progress.step ?? statusLabel(progress.status)}
          </span>
          {progress.message ? ` — ${progress.message}` : ''}
        </span>
      ) : null}
      {submitError ? (
        <span className="max-w-[180px] truncate text-metadata text-destructive">{submitError}</span>
      ) : null}
      <Button data-testid="rescan-button" size="sm" onClick={handleClick} disabled={isRunning}>
        {isRunning ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Scanning…
          </>
        ) : (
          <>
            <Play className="h-3.5 w-3.5" />
            Re-scan
          </>
        )}
      </Button>
      {showProgress ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0"
          data-testid="scan-progress"
          data-status={progress.status}
        >
          <div className="h-1 overflow-hidden bg-muted">
            <div
              className={cn(
                'h-full transition-all',
                isFailed
                  ? 'bg-destructive'
                  : progress.status === 'completed'
                    ? 'bg-grade-a'
                    : 'bg-primary'
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="sr-only" data-testid="scan-progress-percent">
            {pct}%
          </span>
        </div>
      ) : null}
    </div>
  );
}

function statusLabel(status: string): string {
  switch (status) {
    case 'connecting':
      return 'Connecting…';
    case 'subscribed':
      return 'Waiting for worker…';
    case 'completed':
      return 'Done';
    case 'failed':
      return 'Failed';
    case 'error':
      return 'Connection error';
    default:
      return status;
  }
}
