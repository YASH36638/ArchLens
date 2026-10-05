'use client';

import { Fragment, useMemo, useState } from 'react';
import { ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react';
import type {
  ReportModuleDetailDto,
  ReportModuleFileDto,
  ReportModuleScoreDto,
  Severity,
  Smell,
} from '@archlens/shared-types';
import { FileSourceView } from './file-source-view';
import { SmellFixSuggestion } from './smell-fix-suggestion';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatScore, formatRatio, formatOptionalInt } from '@/lib/utils/format';
import { classifyModuleShape } from '@/lib/utils/module-shape';
import { scoreSurface } from '@/lib/utils/grade';
import { cn } from '@/lib/utils/cn';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getReportModule } from '@/lib/api/reports';

interface ExpandableModulesTableProps {
  scanId: string;
  modules: ReportModuleScoreDto[];
}

interface DetailState {
  loading: boolean;
  detail?: ReportModuleDetailDto;
  error?: string;
}

type IssueFilter = 'all' | 'with-smells' | 'without-smells';
type SortOption = 'score' | 'smells' | 'loc' | 'name';
type AdvancedColumn = 'fanIn' | 'fanOut' | 'cohesion' | 'instability' | 'distance';

const ADVANCED_COLUMNS: Array<{ key: AdvancedColumn; label: string }> = [
  { key: 'fanIn', label: 'Fan-in' },
  { key: 'fanOut', label: 'Fan-out' },
  { key: 'cohesion', label: 'Cohesion' },
  { key: 'instability', label: 'Instability' },
  { key: 'distance', label: 'Distance' },
];

function moduleScore(module: ReportModuleScoreDto): number {
  return (
    module.scoreBreakdown?.overall ??
    Math.max(0, 100 - module.avgComplexity * 5 - module.smellCount * 2)
  );
}

export function ExpandableModulesTable({ scanId, modules }: ExpandableModulesTableProps) {
  const token = useAuthToken();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<Record<string, DetailState>>({});
  const [query, setQuery] = useState('');
  const [issueFilter, setIssueFilter] = useState<IssueFilter>('all');
  const [shapeFilter, setShapeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('score');
  const [advancedColumns, setAdvancedColumns] = useState<Record<AdvancedColumn, boolean>>({
    fanIn: false,
    fanOut: false,
    cohesion: false,
    instability: false,
    distance: false,
  });

  const availableShapes = useMemo(() => {
    const shapes = new Map<string, string>();
    modules.forEach((module) => {
      const shape = classifyModuleShape(module);
      shapes.set(shape?.shape ?? 'standard', shape?.label ?? 'standard');
    });
    return [...shapes.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [modules]);

  const filteredModules = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return modules
      .filter((module) => {
        const shape = classifyModuleShape(module)?.shape ?? 'standard';
        const matchesQuery =
          normalizedQuery.length === 0 || module.name.toLocaleLowerCase().includes(normalizedQuery);
        const matchesIssues =
          issueFilter === 'all' ||
          (issueFilter === 'with-smells' ? module.smellCount > 0 : module.smellCount === 0);
        return matchesQuery && matchesIssues && (shapeFilter === 'all' || shape === shapeFilter);
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'loc') return b.totalLoc - a.totalLoc || a.name.localeCompare(b.name);
        if (sortBy === 'smells') return b.smellCount - a.smellCount || a.name.localeCompare(b.name);
        return moduleScore(b) - moduleScore(a) || a.name.localeCompare(b.name);
      });
  }, [issueFilter, modules, query, shapeFilter, sortBy]);

  if (modules.length === 0) {
    return (
      <Card>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="text-center text-[15px] text-muted-foreground">
                No modules detected.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    );
  }

  const primary = filteredModules.filter((m) => m.fileCount > 1);
  const small = filteredModules.filter((m) => m.fileCount <= 1);
  const showDMain = modules.some((m) => m.martinDistance !== undefined);
  const visibleAdvancedColumns = ADVANCED_COLUMNS.filter(
    ({ key }) => advancedColumns[key] && (key !== 'distance' || showDMain)
  );
  const activeFilterCount =
    (query.trim() ? 1 : 0) + (issueFilter !== 'all' ? 1 : 0) + (shapeFilter !== 'all' ? 1 : 0);
  const clearFilters = () => {
    setQuery('');
    setIssueFilter('all');
    setShapeFilter('all');
  };

  const toggle = async (moduleId: string): Promise<void> => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
    // Fetch on first open. Already-loaded details stay cached.
    if (!moduleId) return;
    if (expanded.has(moduleId)) return;
    if (details[moduleId]?.detail || details[moduleId]?.loading) return;
    setDetails((prev) => ({ ...prev, [moduleId]: { loading: true } }));
    try {
      const detail = await getReportModule(token, scanId, moduleId);
      setDetails((prev) => ({ ...prev, [moduleId]: { loading: false, detail } }));
    } catch (e) {
      setDetails((prev) => ({
        ...prev,
        [moduleId]: { loading: false, error: e instanceof Error ? e.message : 'Failed to load' },
      }));
    }
  };

  const colSpan = 6 + visibleAdvancedColumns.length;

  return (
    <div className="space-y-3 text-[15px]">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 lg:flex-row lg:items-end">
        <label className="min-w-0 flex-1">
          <span className="mb-1.5 block text-sm font-medium text-foreground">Search modules</span>
          <span className="relative block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by module name"
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-[15px] outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </span>
        </label>
        <label className="min-w-40">
          <span className="mb-1.5 block text-sm font-medium text-foreground">Issues</span>
          <select
            value={issueFilter}
            onChange={(event) => setIssueFilter(event.target.value as IssueFilter)}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">All modules</option>
            <option value="with-smells">Has smells</option>
            <option value="without-smells">No smells</option>
          </select>
        </label>
        <label className="min-w-44">
          <span className="mb-1.5 block text-sm font-medium text-foreground">Shape</span>
          <select
            value={shapeFilter}
            onChange={(event) => setShapeFilter(event.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">All shapes</option>
            {availableShapes.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-44">
          <span className="mb-1.5 block text-sm font-medium text-foreground">Sort by</span>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SortOption)}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="score">Score (high to low)</option>
            <option value="smells">Smells (high to low)</option>
            <option value="loc">LOC (high to low)</option>
            <option value="name">Name (A–Z)</option>
          </select>
        </label>
        <details className="group relative">
          <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Advanced columns
            {visibleAdvancedColumns.length > 0 ? (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-badge">
                {visibleAdvancedColumns.length}
              </span>
            ) : null}
          </summary>
          <fieldset className="absolute right-0 z-30 mt-2 min-w-56 rounded-xl border border-border bg-card p-2 shadow-md">
            <legend className="sr-only">Advanced column visibility</legend>
            {ADVANCED_COLUMNS.map(({ key, label }) => {
              const unavailable = key === 'distance' && !showDMain;
              return (
                <label
                  key={key}
                  className={cn(
                    'flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm hover:bg-muted',
                    unavailable && 'cursor-not-allowed opacity-50'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={advancedColumns[key]}
                    disabled={unavailable}
                    onChange={(event) =>
                      setAdvancedColumns((current) => ({
                        ...current,
                        [key]: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-input"
                  />
                  {label}
                </label>
              );
            })}
          </fieldset>
        </details>
        {activeFilterCount > 0 ? (
          <button
            type="button"
            onClick={clearFilters}
            className="flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Clear
          </button>
        ) : null}
      </div>
      <Card className="rounded-[14px] border-border bg-card shadow-xs overflow-hidden">
        <Table className="min-w-[760px] text-[15px]">
          <caption className="sr-only">
            Repository modules. Activate a module name to show its files and smells.
          </caption>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-20 min-w-64 bg-muted text-sm">Module</TableHead>
              <TableHead className="text-right text-sm">Files</TableHead>
              <TableHead className="text-right text-sm">LOC</TableHead>
              <TableHead className="text-right text-sm">Avg cx</TableHead>
              <TableHead className="text-right text-sm">Smells</TableHead>
              {advancedColumns.fanIn ? (
                <TableHead
                  className="text-right text-sm"
                  title="Fan-in: modules importing this one"
                >
                  Fan-in
                </TableHead>
              ) : null}
              {advancedColumns.fanOut ? (
                <TableHead className="text-right text-sm" title="Fan-out: modules this one imports">
                  Fan-out
                </TableHead>
              ) : null}
              {advancedColumns.cohesion ? (
                <TableHead
                  className="text-right text-sm"
                  title="Internal-edge / total-edge ratio. Higher = more self-contained."
                >
                  Cohesion
                </TableHead>
              ) : null}
              {advancedColumns.instability ? (
                <TableHead
                  className="text-right text-sm"
                  title="Martin's I = fanOut / (fanIn + fanOut). 0 = stable provider, 1 = volatile consumer."
                >
                  Instability
                </TableHead>
              ) : null}
              {advancedColumns.distance && showDMain ? (
                <TableHead
                  className="text-right text-sm"
                  title="|abstractness + instability − 1|. Far from 0 = zone of pain or uselessness."
                >
                  Distance
                </TableHead>
              ) : null}
              <TableHead className="text-right text-sm">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {primary.map((m) => {
              const isOpen = expanded.has(m.id);
              const overall = moduleScore(m);
              const shape = classifyModuleShape(m);
              const detailState = details[m.id];
              const detailId = `module-detail-${encodeURIComponent(m.id)}`;
              const controlId = `module-control-${encodeURIComponent(m.id)}`;
              return (
                <Fragment key={m.id}>
                  <TableRow
                    data-testid="module-row"
                    aria-expanded={isOpen}
                    aria-controls={detailId}
                    aria-labelledby={controlId}
                    onClick={() => void toggle(m.id)}
                    className="group cursor-pointer hover:bg-muted/40"
                  >
                    <TableCell className="sticky left-0 z-10 bg-card font-medium group-hover:bg-muted">
                      <button
                        id={controlId}
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={detailId}
                        onClick={(event) => {
                          event.stopPropagation();
                          void toggle(m.id);
                        }}
                        className="flex w-full items-center gap-2 rounded text-left text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <ChevronRight
                          className={cn(
                            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                            isOpen && 'rotate-90'
                          )}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 truncate">{m.name}</span>
                        {shape ? (
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 text-badge font-semibold ${shape.color}`}
                            title={shape.description}
                          >
                            {shape.label}
                          </span>
                        ) : null}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">{m.fileCount}</TableCell>
                    <TableCell className="text-right">{m.totalLoc}</TableCell>
                    <TableCell className="text-right">{formatScore(m.avgComplexity)}</TableCell>
                    <TableCell className="text-right">{m.smellCount}</TableCell>
                    {advancedColumns.fanIn ? (
                      <TableCell className="text-right">{formatOptionalInt(m.fanIn)}</TableCell>
                    ) : null}
                    {advancedColumns.fanOut ? (
                      <TableCell className="text-right">{formatOptionalInt(m.fanOut)}</TableCell>
                    ) : null}
                    {advancedColumns.cohesion ? (
                      <TableCell className="text-right">{formatRatio(m.cohesionRatio)}</TableCell>
                    ) : null}
                    {advancedColumns.instability ? (
                      <TableCell className="text-right">{formatRatio(m.instability)}</TableCell>
                    ) : null}
                    {advancedColumns.distance && showDMain ? (
                      <TableCell className="text-right">{formatRatio(m.martinDistance)}</TableCell>
                    ) : null}
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          'inline-flex min-w-[2.75rem] justify-center rounded-md border px-2 py-0.5 text-sm font-semibold',
                          scoreSurface(overall).chip
                        )}
                      >
                        {formatScore(overall)}
                      </span>
                    </TableCell>
                  </TableRow>

                  {isOpen ? (
                    <TableRow id={detailId} data-testid="module-detail">
                      <TableCell colSpan={colSpan} className="bg-muted/20 p-4">
                        <ModuleDetailPanel scanId={scanId} module={m} state={detailState} />
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              );
            })}
            {filteredModules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="h-40 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                    <Search className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    <p className="font-medium">No modules match these filters.</p>
                    <p className="text-sm text-muted-foreground">
                      Try another search term or clear the active filters.
                    </p>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-1 rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Clear filters
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>

      {small.length > 0 ? (
        <details
          className="rounded-lg border bg-muted/30 p-3 text-[15px]"
          data-testid="small-modules"
        >
          <summary className="cursor-pointer font-medium text-foreground">
            {small.length} smaller module{small.length === 1 ? '' : 's'} (single-file)
          </summary>
          <ul className="mt-3 grid grid-cols-1 gap-1 md:grid-cols-2">
            {small.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-4 rounded px-2 py-1.5 text-[15px]"
              >
                <span className="font-medium">{m.name}</span>
                <span className="text-muted-foreground">
                  {m.totalLoc} LOC · {m.smellCount} smell{m.smellCount === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function ModuleDetailPanel({
  scanId,
  module,
  state,
}: {
  scanId: string;
  module: ReportModuleScoreDto;
  state: DetailState | undefined;
}) {
  const sb = module.scoreBreakdown;
  return (
    <div className="space-y-4">
      {sb ? (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <ModuleScoreChip
            label="Complexity"
            score={sb.complexity}
            note={sb.measurementNotes?.complexity}
            derivation={sb.derivation?.complexity}
          />
          <ModuleScoreChip
            label="Duplication"
            score={sb.duplication}
            note={sb.measurementNotes?.duplication}
            derivation={sb.derivation?.duplication}
          />
          <ModuleScoreChip
            label="Coupling"
            score={sb.coupling}
            note={sb.measurementNotes?.coupling}
            derivation={sb.derivation?.coupling}
          />
          <ModuleScoreChip
            label="Cohesion"
            score={sb.cohesion}
            note={sb.measurementNotes?.cohesion}
            derivation={sb.derivation?.cohesion}
          />
          <ModuleScoreChip
            label="Smells"
            score={sb.smells}
            note={sb.measurementNotes?.smells}
            derivation={sb.derivation?.smells}
          />
        </div>
      ) : null}

      {!state || state.loading ? (
        <div className="text-[15px] text-muted-foreground">Loading module details…</div>
      ) : state.error ? (
        <div className="text-[15px] text-red-600">Could not load details: {state.error}</div>
      ) : state.detail ? (
        <>
          <FilesSection detail={state.detail} />
          <SmellsSection scanId={scanId} files={state.detail.files} smells={state.detail.smells} />
        </>
      ) : null}
    </div>
  );
}

function ModuleScoreChip({
  label,
  score,
  note,
  derivation,
}: {
  label: string;
  score: number;
  note?: string;
  derivation?: string;
}) {
  const titleText = derivation ? (note ? `${derivation}\n\nNote: ${note}` : derivation) : note;
  const surface = scoreSurface(score);
  return (
    <div
      className={cn('relative overflow-hidden rounded-md border p-2', surface.card)}
      title={titleText}
      data-testid="module-score-chip"
      data-label={label}
      data-tone={surface.tone}
    >
      <div className={cn('absolute inset-y-0 left-0 w-0.5', surface.accent)} aria-hidden />
      <div>
        <div className={cn('text-sm font-medium', surface.muted)}>{label}</div>
        <div className={cn('text-base font-semibold', surface.text)}>{formatScore(score)}</div>
      </div>
    </div>
  );
}

function FilesSection({ detail }: { detail: ReportModuleDetailDto }) {
  if (detail.files.length === 0) {
    return <div className="text-[15px] text-muted-foreground">No files in this module.</div>;
  }
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-muted-foreground">Files</h4>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Path</TableHead>
              <TableHead className="text-right">LOC</TableHead>
              <TableHead className="text-right">Complexity</TableHead>
              <TableHead className="text-right">Smells</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.files.map((f) => (
              <TableRow key={f.irFileId}>
                <TableCell className="font-mono text-[15px]">{f.path}</TableCell>
                <TableCell className="text-right">{f.loc}</TableCell>
                <TableCell className="text-right">{f.complexity}</TableCell>
                <TableCell className="text-right">{f.smellCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

interface OpenSource {
  fileId: string;
  startLine?: number;
  endLine?: number;
  smellId: string;
}

function SmellsSection({
  scanId,
  files,
  smells,
}: {
  scanId: string;
  files: ReportModuleFileDto[];
  smells: Smell[];
}) {
  const [open, setOpen] = useState<OpenSource | null>(null);

  if (smells.length === 0) {
    return (
      <div className="text-[15px] text-muted-foreground">
        No smells in this module. <span aria-hidden>✨</span>
      </div>
    );
  }

  // Resolve a smell's file (by IR path) to its DB file id. The smell.file
  // field stores the IR-relative path, which matches ReportModuleFileDto.path.
  const fileIdByPath = new Map(files.map((f) => [f.path, f.id]));

  const grouped: Record<Severity, Smell[]> = {
    critical: [],
    major: [],
    minor: [],
    info: [],
  };
  for (const s of smells) grouped[s.severity].push(s);

  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
        Smells in this module ({smells.length})
      </h4>
      <div className="space-y-3">
        {(['critical', 'major', 'minor', 'info'] as Severity[]).map((sev) =>
          grouped[sev].length > 0 ? (
            <div key={sev}>
              <div className="mb-1 flex items-center gap-2">
                <SeverityChip severity={sev} />
                <span className="text-sm text-muted-foreground">
                  {grouped[sev].length} finding{grouped[sev].length === 1 ? '' : 's'}
                </span>
              </div>
              <ul className="space-y-1 text-[15px]">
                {grouped[sev].map((s) => {
                  const fileId = fileIdByPath.get(s.file);
                  const isOpen = open?.smellId === s.id;
                  const canOpen = Boolean(fileId);
                  return (
                    <li key={s.id} className="rounded border bg-background">
                      <button
                        type="button"
                        disabled={!canOpen}
                        onClick={() => {
                          if (!fileId) return;
                          if (isOpen) {
                            setOpen(null);
                            return;
                          }
                          setOpen({
                            fileId,
                            startLine: s.location?.startLine,
                            endLine: s.location?.endLine,
                            smellId: s.id,
                          });
                        }}
                        className="flex w-full flex-col items-stretch gap-0.5 px-3 py-1.5 text-left hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
                        data-testid="smell-row"
                        title={
                          canOpen
                            ? 'Show source'
                            : 'Source not available — file is outside the captured snapshot'
                        }
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="font-medium">{s.ruleId}</span>
                          <span className="font-mono text-metadata text-muted-foreground">
                            {s.file}
                            {s.location ? `:${s.location.startLine}` : ''}
                          </span>
                        </div>
                        <div className="text-[15px] text-muted-foreground">{s.message}</div>
                      </button>
                      {isOpen && fileId ? (
                        <div className="space-y-2 border-t p-2">
                          <FileSourceView
                            scanId={scanId}
                            fileId={fileId}
                            focusStartLine={s.location?.startLine}
                            focusEndLine={s.location?.endLine}
                          />
                          <SmellFixSuggestion scanId={scanId} smellId={s.id} />
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

function SeverityChip({ severity }: { severity: Severity }) {
  const color: Record<Severity, string> = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    major: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
    minor: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    info: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  };
  return (
    <span className={`rounded px-2 py-0.5 text-badge font-semibold ${color[severity]}`}>
      {severity}
    </span>
  );
}
