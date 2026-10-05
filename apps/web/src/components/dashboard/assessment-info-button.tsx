'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Info, Loader2, Sparkles } from 'lucide-react';
import type { ReportSummaryDto, SmellDefinitionDto } from '@archlens/shared-types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getReportSummary } from '@/lib/api/reports';
import { getSmellCatalog } from '@/lib/api/smell-catalog';
import {
  buildAssessmentRecommendations,
  type AssessmentRecommendation,
} from '@/lib/assessment/recommendations';
import { formatScore } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

interface AssessmentInfoButtonProps {
  scanId: string;
  repoFullName: string;
  repoHref: string;
}

const PRIORITY_STYLES: Record<AssessmentRecommendation['priority'], string> = {
  high: 'bg-rose-100/80 text-rose-800 border-rose-200',
  medium: 'bg-amber-100/80 text-amber-900 border-amber-200',
  low: 'bg-emerald-100/70 text-emerald-800 border-emerald-200',
};

export function AssessmentInfoButton({
  scanId,
  repoFullName,
  repoHref,
}: AssessmentInfoButtonProps) {
  const token = useAuthToken();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<AssessmentRecommendation[]>([]);
  const [summary, setSummary] = useState<ReportSummaryDto | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setError('Sign in again to load recommendations.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [report, catalog] = await Promise.all([
        getReportSummary(token, scanId),
        getSmellCatalog().catch(() => [] as SmellDefinitionDto[]),
      ]);
      setSummary(report);
      setItems(buildAssessmentRecommendations(report, catalog));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load assessment');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [scanId, token]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const sb = summary?.scoreBreakdown;

  return (
    <>
      <button
        type="button"
        data-testid="assessment-info"
        aria-label={`Assessment recommendations for ${repoFullName}`}
        title="Why this score"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:border-emerald-400 hover:text-emerald-700"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[85vh] max-w-xl overflow-y-auto"
          data-testid="assessment-panel"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-700" />
              Why this score · {repoFullName}
            </DialogTitle>
            <DialogDescription>
              Complete assessment from the latest scan
              {sb ? ` (overall ${formatScore(sb.overall)}/100)` : ''}.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing architecture signals…
            </div>
          ) : error ? (
            <div className="space-y-3 py-4">
              <p className="text-sm text-destructive">{error}</p>
              <Button size="sm" variant="outline" onClick={() => void load()}>
                Retry
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {sb ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(
                    [
                      ['Overall', sb.overall],
                      ['Complexity', sb.complexity],
                      ['Duplication', sb.duplication],
                      ['Coupling', sb.coupling],
                      ['Cohesion', sb.cohesion],
                      ['Smells', sb.smells],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} className="rounded-md border border-border px-2.5 py-2">
                      <div className="text-metadata uppercase tracking-wide text-muted-foreground">
                        {label}
                      </div>
                      <div className="text-sm font-semibold">{formatScore(value)}</div>
                    </div>
                  ))}
                </div>
              ) : null}

              {summary?.counts ? (
                <p className="text-metadata text-muted-foreground">
                  {summary.counts.modules} modules · {summary.counts.files} files ·{' '}
                  {summary.counts.smells} smells
                  {summary.cycles?.length ? ` · ${summary.cycles.length} dependency cycle(s)` : ''}
                </p>
              ) : null}

              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.id} className="rounded-lg border border-border p-3">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn('capitalize', PRIORITY_STYLES[item.priority])}
                      >
                        {item.priority}
                      </Badge>
                      {item.metric ? (
                        <span className="text-metadata uppercase tracking-wide text-muted-foreground">
                          {item.metric}
                        </span>
                      ) : null}
                    </div>
                    <div className="font-medium leading-snug">{item.title}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p>
                    <p className="mt-2 text-sm">
                      <span className="font-medium">Do this: </span>
                      {item.action}
                    </p>
                    {item.relatedPath ? (
                      <p className="mt-1 truncate font-mono text-metadata text-muted-foreground">
                        {item.relatedPath}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button asChild variant="outline" size="sm">
              <Link href={repoHref}>Open repository</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
