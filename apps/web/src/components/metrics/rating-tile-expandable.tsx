'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import type {
  MetricDefinitionDto,
  MetricId,
  ReportModuleScoreDto,
  Smell,
  SmellDefinitionDto,
} from '@archlens/shared-types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';
import { formatScore } from '@/lib/utils/format';
import { scoreSurface } from '@/lib/utils/grade';

interface RatingTileExpandableProps {
  metricId: MetricId;
  label: string;
  score: number;
  note?: string;
  derivation?: string;
  /** Catalog entry for this metric. Undefined while the catalog is still loading. */
  metric?: MetricDefinitionDto;
  /** Per-module data so we can surface the top offenders. */
  modules: ReportModuleScoreDto[];
  /** Top smells from the report — used to highlight relevant playbook steps. */
  topSmells: ReadonlyArray<Smell>;
  /** Smell catalog — used to surface per-smell remediation strings. */
  smellCatalog?: ReadonlyArray<SmellDefinitionDto>;
}

export function RatingTileExpandable({
  metricId,
  label,
  score,
  note,
  derivation,
  metric,
  modules,
  topSmells,
  smellCatalog,
}: RatingTileExpandableProps) {
  const [open, setOpen] = useState(false);
  const surface = scoreSurface(score);

  return (
    <Card
      className={cn('relative overflow-hidden', surface.card)}
      data-testid="rating-tile"
      data-label={label}
      data-tone={surface.tone}
    >
      <div className={cn('absolute inset-y-0 left-0 w-1', surface.accent)} aria-hidden />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 p-4 text-left transition hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
        aria-expanded={open}
        data-testid={`rating-tile-toggle-${metricId}`}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className={cn('text-[15px]', surface.muted)}>{label}</span>
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 transition-transform',
                surface.muted,
                open && 'rotate-180'
              )}
            />
          </div>
          <div className={cn('mt-1 text-2xl font-semibold', surface.text)}>
            {formatScore(score)}
          </div>
          {note ? (
            <div className="mt-1 text-sm text-muted-foreground">
              {note.length > 32 ? `${note.slice(0, 32)}…` : note}
            </div>
          ) : null}
        </div>
      </button>

      {open ? (
        <ExplainerPanel
          metricId={metricId}
          score={score}
          note={note}
          derivation={derivation}
          metric={metric}
          modules={modules}
          topSmells={topSmells}
          smellCatalog={smellCatalog}
        />
      ) : null}
    </Card>
  );
}

interface ExplainerPanelProps {
  metricId: MetricId;
  score: number;
  note?: string;
  derivation?: string;
  metric?: MetricDefinitionDto;
  modules: ReportModuleScoreDto[];
  topSmells: ReadonlyArray<Smell>;
  smellCatalog?: ReadonlyArray<SmellDefinitionDto>;
}

function ExplainerPanel({
  metricId,
  score,
  note,
  derivation,
  metric,
  modules,
  topSmells,
  smellCatalog,
}: ExplainerPanelProps) {
  const offenders = pickOffenders(metricId, modules).slice(0, 3);
  const gap = metric ? Math.max(0, metric.optimal.min - score) : 0;
  const presentRules = new Set(topSmells.map((s) => s.ruleId));
  const playbook = metric ? rankPlaybookSteps(metric.improvementPlaybook, presentRules) : [];
  const band = metric ? bandForScore(metric, score) : undefined;
  // Concrete per-offender fixes pulled straight from this repo's report —
  // matched to the current metric via metric.relatedSmells, severity-ranked,
  // and joined to SMELL_CATALOG for the remediation copy.
  const mitigations =
    metric && smellCatalog ? pickMitigations(metric, topSmells, smellCatalog) : [];

  return (
    <div
      className="border-t border-border bg-muted/30 px-4 py-4 text-[15px]"
      data-testid={`rating-tile-panel-${metricId}`}
    >
      {derivation ? (
        <p className="leading-6 text-muted-foreground">
          <span className="font-semibold">How this score was computed: </span>
          {derivation}
        </p>
      ) : null}
      {note ? <p className="mt-2 leading-6 text-muted-foreground">{note}</p> : null}

      {metric ? (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Stat label="Your score" value={formatScore(score)} />
          <Stat label="Optimal" value={`${metric.optimal.min}+`} />
          <Stat
            label="Gap"
            value={gap === 0 ? 'on target' : `${formatScore(gap)} pts`}
            tone={gap === 0 ? 'good' : gap > 20 ? 'bad' : 'warn'}
          />
        </div>
      ) : null}

      {band && metric ? (
        <p className="mt-3 leading-6 text-muted-foreground">
          <span className="font-semibold">Currently in the &ldquo;{band.label}&rdquo; band: </span>
          {band.meaning}
        </p>
      ) : null}

      {metric ? (
        <p className="mt-2 leading-6 text-muted-foreground">
          <span className="font-semibold">Why it matters: </span>
          {metric.shortDescription}{' '}
          <Link href="/metrics" className="underline">
            See full formula →
          </Link>
        </p>
      ) : null}

      {offenders.length > 0 ? (
        <div className="mt-3">
          <h4 className="text-sm font-semibold text-foreground">Top modules dragging this down</h4>
          <ul className="mt-1 space-y-1">
            {offenders.map((o) => (
              <li
                key={o.module.id}
                className="flex items-center justify-between rounded border border-border bg-background px-3 py-2 text-sm"
              >
                <span className="font-medium">{o.module.name}</span>
                <span className="text-muted-foreground">{o.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {mitigations.length > 0 ? (
        <div className="mt-3" data-testid={`rating-tile-mitigations-${metricId}`}>
          <h4 className="text-sm font-semibold text-foreground">
            Exact mitigations ({mitigations.length})
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Specific offenders in this repo, ranked worst-first.
          </p>
          <ul className="mt-2 space-y-2">
            {mitigations.map((m) => (
              <li
                key={m.id}
                className="rounded border border-border bg-background p-3 text-[15px]"
                data-testid="exact-mitigation"
                data-rule={m.ruleId}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className={cn('text-badge')}>
                    {m.severity}
                  </Badge>
                  <Badge variant="secondary" className="text-badge">
                    {m.ruleId}
                  </Badge>
                  <span className="break-all font-mono text-sm text-muted-foreground">
                    {m.location}
                  </span>
                </div>
                <p className="mt-1 font-medium">{m.message}</p>
                {m.remediation ? (
                  <p className="mt-1 text-muted-foreground">
                    <span className="font-semibold">Fix: </span>
                    {m.remediation}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {playbook.length > 0 ? (
        <div className="mt-3">
          <h4 className="text-sm font-semibold text-foreground">
            {mitigations.length > 0 ? 'General playbook' : 'How to improve'}
          </h4>
          <ol className="mt-1 space-y-2">
            {playbook.slice(0, 3).map((step) => (
              <li
                key={step.title}
                className="rounded border border-border bg-background p-3 text-[15px]"
              >
                <div className="font-semibold">
                  {step.title}
                  {step.isRelevant ? (
                    <Badge variant="secondary" className="ml-2 text-badge">
                      relevant
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-muted-foreground">{step.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'good' | 'warn' | 'bad';
}) {
  const toneClass =
    tone === 'good'
      ? 'text-emerald-700 dark:text-emerald-300'
      : tone === 'bad'
        ? 'text-rose-700 dark:text-rose-300'
        : tone === 'warn'
          ? 'text-amber-700 dark:text-amber-300'
          : '';
  return (
    <div className="rounded bg-background p-2">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={cn('mt-0.5 text-sm font-semibold', toneClass)}>{value}</div>
    </div>
  );
}

interface Offender {
  module: ReportModuleScoreDto;
  /** Why this module is dragging the dimension down, in one short phrase. */
  reason: string;
  /** Lower = worse. Used for sorting. */
  rank: number;
}

function pickOffenders(metricId: MetricId, modules: ReportModuleScoreDto[]): Offender[] {
  // Only consider modules with multiple files; single-file modules are noise.
  const candidates = modules.filter((m) => m.fileCount > 1);
  switch (metricId) {
    case 'cohesion': {
      const withRatio = candidates.filter((m) => m.cohesionRatio !== undefined);
      return withRatio
        .map<Offender>((m) => ({
          module: m,
          reason: `cohesion ${Math.round((m.cohesionRatio ?? 0) * 100)}%`,
          rank: m.cohesionRatio ?? 1,
        }))
        .sort((a, b) => a.rank - b.rank);
    }
    case 'coupling': {
      return candidates
        .map<Offender>((m) => {
          const fanIn = m.fanIn ?? 0;
          const fanOut = m.fanOut ?? 0;
          const dual = fanIn * fanOut;
          return {
            module: m,
            reason: `in ${fanIn} · out ${fanOut}${dual > 25 ? ' · dual-hub' : ''}`,
            rank: -dual - fanOut, // worst first (most negative)
          };
        })
        .filter((o) => o.rank < 0)
        .sort((a, b) => a.rank - b.rank);
    }
    case 'complexity': {
      return candidates
        .map<Offender>((m) => ({
          module: m,
          reason: `avg cx ${m.avgComplexity.toFixed(1)} · max ${m.maxComplexity}`,
          rank: -m.maxComplexity,
        }))
        .filter((o) => o.module.maxComplexity > 0)
        .sort((a, b) => a.rank - b.rank);
    }
    case 'duplication':
      // jscpd runs repo-wide; per-module attribution isn't available.
      return [];
    default:
      return [];
  }
}

interface RankedStep {
  title: string;
  detail: string;
  isRelevant: boolean;
}

function rankPlaybookSteps(
  steps: MetricDefinitionDto['improvementPlaybook'],
  presentRules: ReadonlySet<string>
): RankedStep[] {
  return steps
    .map((step) => ({
      title: step.title,
      detail: step.detail,
      isRelevant: !!step.triggeringSmells?.some((r) => presentRules.has(r)),
    }))
    .sort((a, b) => Number(b.isRelevant) - Number(a.isRelevant));
}

function bandForScore(metric: MetricDefinitionDto, score: number) {
  return metric.bands.find((b) => score >= b.min && score <= b.max);
}

export interface Mitigation {
  id: string;
  ruleId: string;
  severity: Smell['severity'];
  message: string;
  location: string;
  remediation: string | null;
}

const SEVERITY_RANK: Record<Smell['severity'], number> = {
  critical: 0,
  major: 1,
  minor: 2,
  info: 3,
};

/**
 * Filter the report's top smells down to ones the user can act on for THIS
 * metric, then enrich each one with the matching catalog remediation. The
 * panel renders these as the "Exact mitigations" list — one row per
 * offending function/class with file:line and a concrete fix.
 */
export function pickMitigations(
  metric: MetricDefinitionDto,
  topSmells: ReadonlyArray<Smell>,
  smellCatalog: ReadonlyArray<SmellDefinitionDto>
): Mitigation[] {
  const related = new Set(metric.relatedSmells);
  if (related.size === 0) return [];
  const catalogByRule = new Map(smellCatalog.map((s) => [s.ruleId, s]));
  return topSmells
    .filter((s) => related.has(s.ruleId))
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
    .slice(0, 5)
    .map((s) => {
      const loc = s.location
        ? s.location.startLine === s.location.endLine
          ? `${s.file}:${s.location.startLine}`
          : `${s.file}:${s.location.startLine}-${s.location.endLine}`
        : s.file;
      return {
        id: s.id,
        ruleId: s.ruleId,
        severity: s.severity,
        message: s.message,
        location: loc,
        remediation: catalogByRule.get(s.ruleId)?.remediation ?? null,
      };
    });
}
