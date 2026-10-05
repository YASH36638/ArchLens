'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MetricDefinitionDto, MetricScoreBand } from '@archlens/shared-types';
import { Badge } from '@/components/ui/badge';
import { CollapsibleSection } from '@/components/glossary/collapsible-section';
import { cn } from '@/lib/utils/cn';

const BAND_TONE: Record<MetricScoreBand['label'], string> = {
  Excellent: 'bg-success',
  Good: 'bg-success/70',
  'At risk': 'bg-warning',
  Critical: 'bg-risk',
};

const BAND_CHIP: Record<MetricScoreBand['label'], string> = {
  Excellent: 'bg-success/15 text-success',
  Good: 'bg-success/15 text-success',
  'At risk': 'bg-warning/15 text-warning',
  Critical: 'bg-risk/15 text-risk',
};

const RANGE_GROUP: Record<MetricScoreBand['label'], 'Good' | 'Warning' | 'Critical'> = {
  Excellent: 'Good',
  Good: 'Good',
  'At risk': 'Warning',
  Critical: 'Critical',
};

export function MetricCatalogTabs({
  metrics,
  query = '',
}: {
  metrics: MetricDefinitionDto[];
  query?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const first = metrics[0]?.metricId;
  const requestedMetric = searchParams.get('metric');
  const selectedMetric =
    first && metrics.some((metric) => metric.metricId === requestedMetric)
      ? requestedMetric!
      : first;

  const q = query.trim().toLowerCase();
  const navMetrics = q ? metrics.filter((metric) => metricMatches(metric, q)) : metrics;
  const selected = metrics.find((metric) => metric.metricId === selectedMetric) ?? metrics[0];
  const selectedIndex = selected
    ? metrics.findIndex((metric) => metric.metricId === selected.metricId)
    : -1;
  const previous = selectedIndex > 0 ? metrics[selectedIndex - 1] : undefined;
  const next = selectedIndex >= 0 ? metrics[selectedIndex + 1] : undefined;
  const navIds = navMetrics.map((metric) => metric.metricId).join(',');

  function selectMetric(metricId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'metrics');
    params.set('metric', metricId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    if (!q || !selected) return;
    const ids = navIds ? navIds.split(',') : [];
    if (ids.includes(selected.metricId)) return;
    const firstMatch = ids[0];
    if (!firstMatch) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', 'metrics');
    params.set('metric', firstMatch);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [q, navIds, selected?.metricId, pathname, router, searchParams]);

  if (!selected) return null;

  return (
    <div className="grid min-h-0 gap-3 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:items-start">
      <nav
        className="flex h-auto flex-wrap gap-1 lg:sticky lg:top-0 lg:flex-col lg:flex-nowrap"
        data-testid="metric-tabs"
        role="tablist"
        aria-label="Metrics"
      >
        {navMetrics.map((m) => (
          <button
            key={m.metricId}
            type="button"
            role="tab"
            data-testid={`metric-tab-${m.metricId}`}
            aria-selected={m.metricId === selected.metricId}
            onClick={() => selectMetric(m.metricId)}
            className={cn(
              'flex min-h-9 min-w-0 items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-body font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              m.metricId === selected.metricId
                ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
            )}
          >
            <span className="truncate">{m.name}</span>
            <span className="shrink-0 font-mono text-metadata tabular-nums text-muted-foreground">
              {weightPercent(m.weight)}
            </span>
          </button>
        ))}
        {q && navMetrics.length === 0 ? (
          <p className="px-2.5 py-2 text-body text-muted-foreground">No matching metrics.</p>
        ) : null}
      </nav>

      <MetricDetail metric={selected} previous={previous} next={next} onSelect={selectMetric} />
    </div>
  );
}

function MetricDetail({
  metric,
  previous,
  next,
  onSelect,
}: {
  metric: MetricDefinitionDto;
  previous?: MetricDefinitionDto;
  next?: MetricDefinitionDto;
  onSelect: (metricId: string) => void;
}) {
  const weightLabel = weightPercent(metric.weight);

  return (
    <article
      className="min-w-0 space-y-3"
      data-testid="metric-detail"
      data-metric-id={metric.metricId}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">{metric.name}</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-badge font-medium text-muted-foreground">
              {metric.metricId}
            </span>
          </div>
          <p className="mt-1 text-body leading-6 text-muted-foreground">
            {metric.shortDescription}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-right">
            <div className="font-mono text-lg font-semibold tabular-nums leading-none text-foreground">
              {weightLabel}
            </div>
            <div className="mt-0.5 text-badge font-medium text-muted-foreground">
              of overall score
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(14rem,0.8fr)]">
        <section className="rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
          <h3 className="text-metadata font-semibold text-muted-foreground">Why it matters</h3>
          <p className="mt-1.5 text-body leading-6 text-foreground">{metric.description}</p>
        </section>

        <section className="rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
          <h3 className="text-metadata font-semibold text-muted-foreground">Target</h3>
          <p className="mt-1.5 text-body font-semibold text-foreground">
            Aim for {metric.optimal.min}+
          </p>
          <p className="mt-1 text-body leading-6 text-muted-foreground">
            {metric.optimal.rationale}
          </p>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-metadata font-semibold text-muted-foreground">Score ranges</h3>
          <div className="flex gap-2 text-badge font-medium text-muted-foreground">
            <span>Good</span>
            <span>Warning</span>
            <span>Critical</span>
          </div>
        </div>
        <ScoreRangeBar bands={metric.bands} />
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {metric.bands.map((band) => (
            <li
              key={band.label}
              className="min-w-0 rounded-md border border-border/80 bg-muted/30 px-2.5 py-2"
              data-band={band.label}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-badge font-semibold',
                    BAND_CHIP[band.label]
                  )}
                >
                  {RANGE_GROUP[band.label]}
                </span>
                <span className="font-mono text-metadata tabular-nums text-muted-foreground">
                  {band.min}–{band.max}
                </span>
              </div>
              <div className="mt-1 text-body font-medium text-foreground">{band.label}</div>
              <p className="mt-0.5 line-clamp-2 text-metadata leading-5 text-muted-foreground">
                {band.meaning}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <div className="space-y-1.5">
        <CollapsibleSection title="Formula" hint="Hidden by default">
          <ol className="space-y-2">
            {metric.formula.map((step, i) => (
              <li
                key={step.label}
                className="rounded-md border border-border bg-muted/20 px-2.5 py-2"
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-metadata text-muted-foreground">{i + 1}.</span>
                  <span className="text-body font-semibold">{step.label}</span>
                </div>
                <pre className="mt-1.5 overflow-x-auto rounded border border-border bg-background px-2 py-1.5 font-mono text-metadata leading-5">
                  {step.expression}
                </pre>
                <p className="mt-1.5 text-body leading-6 text-muted-foreground">
                  {step.explanation}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-body text-muted-foreground">
            Score derivation: <code className="font-mono">{metric.scoreDerivation}</code>
          </p>
        </CollapsibleSection>

        <CollapsibleSection title="Explanation" hint={`${metric.inputs.length} inputs`}>
          <ul className="space-y-1.5">
            {metric.inputs.map((input) => (
              <li key={input.name} className="text-body leading-6">
                <span className="font-mono text-metadata">{input.name}</span>
                <span className="text-muted-foreground"> — {input.description}</span>
                <span className="mt-0.5 block font-mono text-metadata text-muted-foreground">
                  {input.source}
                </span>
              </li>
            ))}
          </ul>
          {metric.thresholdsUsed.length > 0 ? (
            <ul className="mt-3 space-y-1 border-t border-border pt-2">
              {metric.thresholdsUsed.map((t) => (
                <li key={t.name} className="text-body leading-6">
                  <span className="font-mono">{t.name}</span>
                  <span className="text-muted-foreground"> = </span>
                  <span className="font-mono">{t.value}</span>
                  <span className="text-muted-foreground"> — {t.description}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </CollapsibleSection>

        <CollapsibleSection
          title="Examples"
          hint={`${metric.improvementPlaybook.length} improvement steps`}
        >
          <ol className="space-y-2">
            {metric.improvementPlaybook.map((step, i) => (
              <li key={step.title} className="rounded-md border border-border px-2.5 py-2">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-metadata text-muted-foreground">{i + 1}.</span>
                  <span className="text-body font-semibold">{step.title}</span>
                </div>
                <p className="mt-1 text-body leading-6 text-muted-foreground">{step.detail}</p>
                {step.triggeringSmells && step.triggeringSmells.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {step.triggeringSmells.map((rule) => (
                      <Link key={rule} href={`/glossary?tab=smells#${rule}`}>
                        <Badge variant="outline" className="font-mono text-badge hover:bg-accent">
                          {rule}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        </CollapsibleSection>
      </div>

      {metric.relatedSmells.length > 0 ? (
        <section className="rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
          <h3 className="text-metadata font-semibold text-muted-foreground">Related smells</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {metric.relatedSmells.map((rule) => (
              <Link key={rule} href={`/glossary?tab=smells#${rule}`}>
                <Badge variant="secondary" className="font-mono text-badge hover:bg-accent">
                  {rule}
                </Badge>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <nav className="flex items-center justify-between gap-2 pt-1" aria-label="Metric sequence">
        {previous ? (
          <button
            type="button"
            onClick={() => onSelect(previous.metricId)}
            className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-body font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {previous.name}
          </button>
        ) : (
          <span />
        )}
        {next ? (
          <button
            type="button"
            onClick={() => onSelect(next.metricId)}
            className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-body font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {next.name}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </nav>
    </article>
  );
}

function ScoreRangeBar({ bands }: { bands: readonly MetricScoreBand[] }) {
  return (
    <div
      className="flex h-2 overflow-hidden rounded-full"
      role="img"
      aria-label={bands.map((band) => `${band.label} ${band.min} to ${band.max}`).join(', ')}
    >
      {bands.map((band) => (
        <span
          key={band.label}
          className={cn('h-full', BAND_TONE[band.label])}
          style={{ flexGrow: Math.max(1, band.max - band.min + 1) }}
          title={`${band.label}: ${band.min}–${band.max}`}
        />
      ))}
    </div>
  );
}

function weightPercent(weight: number): string {
  return `${Math.round(weight * 100)}%`;
}

function metricMatches(metric: MetricDefinitionDto, q: string): boolean {
  return [
    metric.name,
    metric.metricId,
    metric.shortDescription,
    metric.description,
    ...metric.relatedSmells,
  ]
    .join(' ')
    .toLowerCase()
    .includes(q);
}
