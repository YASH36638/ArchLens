'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpDown,
  Box,
  DraftingCompass,
  Lock,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Unlock,
  X,
} from 'lucide-react';
import type { DashboardRepoSnapshot } from '@/lib/assessment/recommendations';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Tooltip } from '@/components/ui/tooltip';
import { EmptyState } from '@/components/shared/empty-state';
import { AssessmentInfoButton } from '@/components/dashboard/assessment-info-button';
import { ScoreRing } from '@/components/score/score-ring';
import { BranchSwitcher } from './branch-switcher';
import { HoverMetaChip } from './hover-meta-chip';
import { OwnerAvatar } from './owner-avatar';
import { StatusIndicator } from './status-indicator';
import { formatRelativeDate } from '@/lib/utils/format';
import { projectCategory } from '@/lib/utils/project-category';
import { cn } from '@/lib/utils/cn';

interface ProjectsRepoListProps {
  repos: DashboardRepoSnapshot[];
  initialFocus?: 'attention' | 'issues' | 'stale' | null;
}

type SortOption = 'score' | 'name' | 'recent';
type FocusMode = 'attention' | 'issues' | 'stale' | null;

const STALE_MS = 30 * 24 * 60 * 60 * 1000;

function isStaleRepo(repo: DashboardRepoSnapshot): boolean {
  if (!repo.updatedAt || !repo.scanId) return true;
  const age = Date.now() - new Date(repo.updatedAt).getTime();
  return Number.isNaN(age) || age > STALE_MS;
}

function repoStatus(repo: DashboardRepoSnapshot): 'completed' | 'pending' | 'failed' | 'not-scanned' {
  if (!repo.scanId) return 'not-scanned';
  if (repo.scanStatus === 'completed') return 'completed';
  if (repo.scanStatus === 'failed') return 'failed';
  return 'pending';
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'score', label: 'Score' },
  { value: 'name', label: 'Name' },
  { value: 'recent', label: 'Recent' },
];

const CHIP_TOOLTIPS = {
  contributors:
    'People who have contributed commits to this repository — helpful for ownership and review routing.',
  collaborators: 'GitHub users with direct collaborator access to this repository.',
} as const;

/** Soft restrained tags — informative, never compete with KPIs/scores */
const CHIP_BASE =
  'inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-medium leading-none shadow-none transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/25';

const CHIP = {
  privacy: 'border border-[#D6E8FF] bg-[#EDF4FF] text-[#3B82F6] hover:bg-[#EDF4FF]',
  branch: 'border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] hover:bg-[#F8FAFC]',
  collaborators: 'border border-[#DDD6FE] bg-[#F5F3FF] text-[#7C3AED] hover:bg-[#F5F3FF]',
  contributors: 'border border-[#C7D2FE] bg-[#EEF2FF] text-[#4F46E5] hover:bg-[#EEF2FF]',
  architecture: 'border border-[#CBD5E1] bg-[#F1F5F9] text-[#475569] hover:bg-[#F1F5F9]',
  modules: 'border border-[#BBF7D0] bg-[#ECFDF5] text-[#059669] hover:bg-[#ECFDF5]',
  languages: 'border border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB] hover:bg-[#EFF6FF]',
} as const;

const floatBtnClassName =
  'inline-flex h-6 w-6 items-center justify-center rounded-full shadow-none transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/25';

const ATTENTION_THRESHOLD = 50;

export function ProjectsRepoList({
  repos,
  initialFocus = null,
}: ProjectsRepoListProps) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOption>(
    initialFocus === 'issues' ? 'score' : initialFocus === 'stale' ? 'recent' : 'score'
  );
  const [filterOpen, setFilterOpen] = useState(false);
  const [shortcutLabel, setShortcutLabel] = useState('Ctrl+K');
  const [typeCollapsed, setTypeCollapsed] = useState(false);
  const [focusMode, setFocusMode] = useState<FocusMode>(initialFocus);
  const [attentionPulse, setAttentionPulse] = useState(Boolean(initialFocus));
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
    setShortcutLabel(isMac ? '⌘K' : 'Ctrl+K');
  }, []);

  useEffect(() => {
    if (!initialFocus) return;
    setFocusMode(initialFocus);
    setAttentionPulse(true);
    window.requestAnimationFrame(() => {
      listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    const timer = window.setTimeout(() => setAttentionPulse(false), 2200);
    return () => window.clearTimeout(timer);
  }, [initialFocus]);

  // Capture Ctrl/Cmd+K so Projects search opens instead of the global command palette
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setFilterOpen((open) => !open);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);

  const summary = useMemo(() => {
    const scored = repos.filter((repo) => repo.overall !== null);
    const average =
      scored.length > 0
        ? Math.round(scored.reduce((total, repo) => total + (repo.overall ?? 0), 0) / scored.length)
        : null;
    const smells = repos.reduce((total, repo) => total + (repo.counts?.smells ?? 0), 0);
    const critical = repos.filter(
      (repo) => repo.overall !== null && repo.overall < ATTENTION_THRESHOLD
    ).length;
    return { average, smells, critical };
  }, [repos]);

  const visibleRepos = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return repos
      .filter((repo) => {
        if (focusMode === 'attention') {
          if (repo.overall === null || repo.overall >= ATTENTION_THRESHOLD) return false;
        } else if (focusMode === 'issues') {
          if ((repo.counts?.smells ?? 0) <= 0) return false;
        } else if (focusMode === 'stale') {
          if (!isStaleRepo(repo)) return false;
        }
        if (normalizedQuery.length === 0) return true;
        return [repo.name, repo.fullName, repo.owner].some((value) =>
          value.toLocaleLowerCase().includes(normalizedQuery)
        );
      })
      .sort((a, b) => {
        if (focusMode === 'issues') {
          return (b.counts?.smells ?? 0) - (a.counts?.smells ?? 0);
        }
        if (focusMode === 'stale') {
          const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : -1;
          const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : -1;
          return aTime - bTime;
        }
        if (sort === 'name') return a.name.localeCompare(b.name);
        if (sort === 'recent') {
          const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : -1;
          const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : -1;
          return bTime - aTime;
        }
        if (focusMode === 'attention') {
          if (a.overall === null) return 1;
          if (b.overall === null) return -1;
          return a.overall - b.overall;
        }
        if (a.overall === null) return b.overall === null ? 0 : 1;
        if (b.overall === null) return -1;
        return b.overall - a.overall;
      });
  }, [focusMode, query, repos, sort]);

  const clearFilters = () => {
    setQuery('');
    setFocusMode(null);
    setAttentionPulse(false);
  };

  const focusNeedsAttention = () => {
    if (summary.critical === 0) return;
    const next = focusMode === 'attention' ? null : 'attention';
    setFocusMode(next);
    setAttentionPulse(Boolean(next));
    if (next) {
      window.requestAnimationFrame(() => {
        listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      window.setTimeout(() => setAttentionPulse(false), 2200);
    }
  };

  const tableGrid = typeCollapsed
    ? 'md:grid-cols-[96px_minmax(0,1.45fr)_minmax(0,1fr)_3rem]'
    : 'md:grid-cols-[96px_minmax(0,1.3fr)_minmax(0,0.95fr)_minmax(0,1.2fr)]';

  const hasActiveSearch = query.trim().length > 0;
  const sortLabel = SORT_OPTIONS.find((option) => option.value === sort)?.label ?? 'Score';

  return (
    <section className="space-y-3" data-testid="projects-list" aria-label="Projects">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiStatCard
          label="Repositories"
          value={repos.length}
          hint="Connected in this workspace"
          tone="repos"
        />
        <KpiStatCard
          label="Average Score"
          value={summary.average ?? '—'}
          hint="Latest completed scans"
          tone="score"
        />
        <KpiStatCard
          label="Total Smells"
          value={summary.smells}
          hint="Across latest scans"
          tone="smells"
        />
        <KpiStatCard
          label="Needs Attention"
          value={summary.critical}
          hint={
            focusMode === 'attention'
              ? 'Showing score below 50 · click to clear'
              : 'Score below 50 · click to focus'
          }
          tone="critical"
          emphasize={summary.critical > 0}
          active={focusMode === 'attention'}
          onClick={summary.critical > 0 ? focusNeedsAttention : undefined}
        />
      </div>

      {(hasActiveSearch || sort !== 'score') && (
        <div className="flex flex-wrap items-center gap-2 px-0.5 text-[12px] text-slate-400">
          {hasActiveSearch ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-slate-200">
              “{query.trim()}”
              <button
                type="button"
                onClick={() => setQuery('')}
                className="rounded p-0.5 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ) : null}
          {sort !== 'score' ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-slate-200">
              Sorted by {sortLabel}
              <button
                type="button"
                onClick={() => setSort('score')}
                className="rounded p-0.5 text-slate-400 hover:bg-white/10 hover:text-white"
                aria-label="Reset sort to score"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ) : null}
        </div>
      )}

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent
          hideClose
          overlayClassName="z-[70]"
          data-testid="project-filters"
          aria-describedby="project-filters-description"
          className="top-[min(18vh,6.5rem)] z-[80] w-[calc(100%-1.5rem)] max-w-xl translate-y-0 gap-0 overflow-hidden p-0 sm:rounded-2xl"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            searchRef.current?.focus();
            searchRef.current?.select();
          }}
        >
          <DialogTitle className="sr-only">Search and sort repositories</DialogTitle>
          <DialogDescription id="project-filters-description" className="sr-only">
            Search connected repositories and choose how the list is sorted.
          </DialogDescription>

          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="h-4 w-4 shrink-0 text-[#4F8CFF]" aria-hidden="true" />
            <input
              ref={searchRef}
              id="project-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search repositories, owners, paths…"
              className="h-12 w-full bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground"
              aria-label="Search repositories"
              autoComplete="off"
              data-testid="project-search"
            />
            <kbd className="hidden shrink-0 rounded-md border border-border bg-muted/80 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground sm:inline">
              {shortcutLabel}
            </kbd>
          </div>

          <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
            <ArrowUpDown className="h-4 w-4 shrink-0 text-[#4F8CFF]" aria-hidden="true" />
            <span className="text-[12px] font-medium text-muted-foreground">Sort by</span>
            <div
              className="flex flex-1 flex-wrap gap-1.5"
              role="group"
              aria-label="Sort repositories"
            >
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSort(option.value)}
                  className={cn(
                    'rounded-lg px-2.5 py-1.5 text-[13px] font-semibold transition-colors',
                    sort === option.value
                      ? 'bg-[#4F8CFF]/15 text-[#4F8CFF]'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                  aria-pressed={sort === option.value}
                  data-testid={`project-sort-${option.value}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div
            className="max-h-[min(18rem,42vh)] overflow-y-auto p-1.5"
            role="listbox"
            aria-label="Matching repositories"
          >
            {visibleRepos.length === 0 ? (
              <p className="px-3 py-8 text-center text-body text-muted-foreground">
                No matching repositories
              </p>
            ) : (
              visibleRepos.slice(0, 12).map((repo) => (
                <Link
                  key={repo.fullName}
                  href={`/repos/${repo.owner}/${repo.name}`}
                  role="option"
                  className="flex min-h-10 items-center gap-3 rounded-md px-2.5 text-left text-button text-foreground outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setFilterOpen(false)}
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{repo.name}</span>
                  <span className="hidden truncate text-metadata text-muted-foreground sm:inline">
                    {repo.owner}
                  </span>
                  <span className="tabular-nums text-metadata text-muted-foreground">
                    {repo.overall === null ? '—' : repo.overall}
                  </span>
                </Link>
              ))
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2.5">
            <p className="text-[12px] text-muted-foreground">
              {visibleRepos.length} of {repos.length} shown in list
            </p>
            <button
              type="button"
              onClick={() => setFilterOpen(false)}
              className="rounded-lg bg-[#4F8CFF] px-3 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#3B7AEF]"
            >
              Done
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <div
        ref={listRef}
        className="overflow-hidden rounded-xl border border-white/10 bg-card shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
      >
        <div
          className={cn(
            'hidden gap-4 border-b border-white/10 bg-[#0F172A] px-5 py-3.5 md:grid md:items-center',
            tableGrid
          )}
        >
          <span className="text-[13px] font-bold uppercase tracking-[0.06em] text-slate-300">
            Score
          </span>
          <span className="text-[13px] font-bold uppercase tracking-[0.06em] text-slate-300">
            Project
          </span>
          <span className="text-[13px] font-bold uppercase tracking-[0.06em] text-slate-300">
            Owner
          </span>
          <div className="relative flex min-h-7 items-center justify-end gap-1">
            {!typeCollapsed ? (
              <span className="mr-auto text-[13px] font-bold uppercase tracking-[0.06em] text-slate-300">
                Project Type
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setTypeCollapsed((value) => !value)}
              className="group/type-edge absolute -left-4 top-1/2 z-10 flex h-10 w-3 -translate-y-1/2 items-center justify-center"
              aria-label={typeCollapsed ? 'Expand project type panel' : 'Collapse project type panel'}
              title={typeCollapsed ? 'Expand project type' : 'Collapse project type'}
              data-testid="project-type-edge-toggle"
            >
              <span className="h-7 w-0.5 rounded-full bg-border transition-all duration-150 group-hover/type-edge:h-9 group-hover/type-edge:w-1 group-hover/type-edge:bg-primary" />
            </button>
            <button
              type="button"
              onClick={() => setTypeCollapsed((value) => !value)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
              aria-label={typeCollapsed ? 'Expand project type panel' : 'Collapse project type panel'}
            >
              {typeCollapsed ? (
                <PanelRightOpen className="h-4 w-4" />
              ) : (
                <PanelRightClose className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {visibleRepos.length === 0 ? (
          <EmptyState
            icon={Search}
            title={
              focusMode === 'attention'
                ? 'No repositories need attention'
                : focusMode === 'issues'
                  ? 'No repositories with issues'
                  : focusMode === 'stale'
                    ? 'No stale repositories'
                    : 'No matching projects'
            }
            description={
              focusMode
                ? 'Try clearing the focus filter to see the full portfolio again.'
                : 'Try another search term, or clear everything to see the full portfolio again.'
            }
            actionLabel="Clear filters"
            onAction={clearFilters}
            testId="projects-empty-search"
          />
        ) : (
          <ul className="divide-y divide-white/10">
            {visibleRepos.map((repo) => {
              const href = `/repos/${repo.owner}/${repo.name}`;
              const hasScore = repo.overall !== null;
              const canAssess = Boolean(repo.scanId && repo.scanStatus === 'completed' && hasScore);
              const category = projectCategory(undefined, repo.topSmellKinds);
              const currentStatus = repoStatus(repo);
              const architectureHref = `/repos/${repo.owner}/${repo.name}/architecture`;
              const needsAttention =
                repo.overall !== null && repo.overall < ATTENTION_THRESHOLD;
              const highlightAttention =
                (focusMode === 'attention' || attentionPulse) && needsAttention;
              const highlightIssues =
                focusMode === 'issues' && (repo.counts?.smells ?? 0) > 0;
              const highlightStale = focusMode === 'stale' && isStaleRepo(repo);

              return (
                <li
                  key={repo.id}
                  className={cn(
                    'group/row relative grid grid-cols-1 gap-4 px-5 py-4 transition-all duration-150 ease-out hover:-translate-y-px hover:bg-white/[0.04] hover:shadow-[0_8px_24px_rgba(8,17,31,0.28)] md:items-center md:gap-4',
                    highlightAttention &&
                      'bg-[rgba(239,68,68,0.06)] shadow-[inset_3px_0_0_0_#EF4444,0_0_0_1px_rgba(239,68,68,0.28),0_0_20px_rgba(239,68,68,0.12)]',
                    highlightIssues &&
                      'bg-[rgba(245,158,11,0.06)] shadow-[inset_3px_0_0_0_#F59E0B,0_0_0_1px_rgba(245,158,11,0.28),0_0_20px_rgba(245,158,11,0.12)]',
                    highlightStale &&
                      'bg-[rgba(37,99,235,0.06)] shadow-[inset_3px_0_0_0_#2563EB,0_0_0_1px_rgba(37,99,235,0.28),0_0_20px_rgba(37,99,235,0.12)]',
                    attentionPulse &&
                      (highlightAttention || highlightIssues || highlightStale) &&
                      'animate-pulse',
                    tableGrid
                  )}
                  data-testid="dashboard-repo-card"
                  data-needs-attention={needsAttention ? 'true' : undefined}
                >
                  <div className="flex items-center gap-3 md:flex-col md:items-center md:gap-1.5">
                    <span className="w-20 text-sm font-semibold text-foreground md:hidden">
                      Score
                    </span>
                    <ScoreRing score={repo.overall} size={72} strokeWidth={6} />
                    {repo.updatedAt ? (
                      <p
                        className="text-metadata text-muted-foreground md:max-w-[96px] md:text-center"
                        suppressHydrationWarning
                        title={new Date(repo.updatedAt).toLocaleString()}
                      >
                        {formatRelativeDate(repo.updatedAt)}
                      </p>
                    ) : (
                      <p className="text-metadata text-muted-foreground">Not scanned</p>
                    )}
                  </div>

                  <div className="min-w-0 space-y-2.5">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <Link href={href} className="min-w-0 truncate">
                          <h3 className="truncate text-xl font-semibold tracking-tight text-foreground transition-colors duration-150 ease-out group-hover/row:text-primary">
                            {repo.name}
                          </h3>
                        </Link>
                        {canAssess && repo.scanId ? (
                          <AssessmentInfoButton
                            scanId={repo.scanId}
                            repoFullName={repo.fullName}
                            repoHref={href}
                          />
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={cn(CHIP_BASE, CHIP.privacy)}>
                        {repo.private ? (
                          <Lock className="h-3 w-3 shrink-0 opacity-80" aria-hidden="true" />
                        ) : (
                          <Unlock className="h-3 w-3 shrink-0 opacity-80" aria-hidden="true" />
                        )}
                        {repo.private ? 'Private' : 'Public'}
                      </span>
                      <BranchSwitcher repoId={repo.id} defaultBranch={repo.defaultBranch} />
                      <StatusIndicator status={currentStatus} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-sm font-semibold text-foreground md:hidden">Owner</span>
                    <div className="flex items-center gap-2">
                      <OwnerAvatar owner={repo.owner} />
                      <p className="text-base font-bold text-foreground">{repo.owner}</p>
                    </div>
                    <div
                      className="flex flex-wrap gap-1.5"
                      aria-label={`Owner details for ${repo.name}`}
                    >
                      <HoverMetaChip
                        repoId={repo.id}
                        label="Collaborators"
                        kind="collaborators"
                        tooltip={CHIP_TOOLTIPS.collaborators}
                        className={cn(CHIP_BASE, CHIP.collaborators)}
                      />
                      <HoverMetaChip
                        repoId={repo.id}
                        label="Contributors"
                        kind="contributors"
                        tooltip={CHIP_TOOLTIPS.contributors}
                        className={cn(CHIP_BASE, CHIP.contributors)}
                      />
                    </div>
                  </div>

                  <div className="relative space-y-2">
                    <div className="flex items-center justify-between gap-2 md:hidden">
                      <span className="text-sm font-semibold text-foreground">Project Type</span>
                      <button
                        type="button"
                        onClick={() => setTypeCollapsed((value) => !value)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label={
                          typeCollapsed ? 'Expand project type panel' : 'Collapse project type panel'
                        }
                      >
                        {typeCollapsed ? (
                          <PanelRightOpen className="h-4 w-4" />
                        ) : (
                          <PanelRightClose className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {typeCollapsed ? (
                      <div
                        className="flex flex-row flex-wrap items-center justify-end gap-2 md:absolute md:right-0 md:top-1/2 md:flex-col md:-translate-y-1/2"
                        data-testid="project-type-floating"
                      >
                        <Link
                          href={architectureHref}
                          className={cn(floatBtnClassName, CHIP.architecture)}
                          aria-label="Architecture"
                        >
                          <DraftingCompass className="h-3 w-3 opacity-90" aria-hidden="true" />
                        </Link>
                        <Link
                          href={href}
                          className={cn(floatBtnClassName, CHIP.modules)}
                          aria-label={`${repo.counts?.modules ?? 0} modules`}
                        >
                          <Box className="h-3 w-3 opacity-90" aria-hidden="true" />
                        </Link>
                        <HoverMetaChip
                          repoId={repo.id}
                          label="Languages"
                          kind="languages"
                          iconOnly
                          iconClassName="opacity-100 text-[#2563EB]"
                          className={cn('h-6 w-6 rounded-full p-0', CHIP_BASE, CHIP.languages)}
                        />
                        <Tooltip content="Open repository overview">
                          <Link
                            href={href}
                            className={cn(floatBtnClassName, CHIP.contributors)}
                            aria-label="Open repository"
                          >
                            <PanelRightOpen className="h-3 w-3 opacity-90" aria-hidden="true" />
                          </Link>
                        </Tooltip>
                      </div>
                    ) : (
                      <>
                        <p className="text-base font-bold text-foreground">{category}</p>
                        <div className="flex flex-wrap gap-1.5">
                          <Link
                            href={architectureHref}
                            className={cn(CHIP_BASE, CHIP.architecture)}
                          >
                            <DraftingCompass
                              className="h-3 w-3 shrink-0 opacity-80"
                              aria-hidden="true"
                            />
                            Architecture
                          </Link>
                          <Link href={href} className={cn(CHIP_BASE, CHIP.modules)}>
                            <Box className="h-3 w-3 shrink-0 opacity-80" aria-hidden="true" />
                            <span className="font-semibold tabular-nums text-[#059669]">
                              {repo.counts?.modules ?? 0}
                            </span>
                            <span className="font-medium opacity-80">Modules</span>
                          </Link>
                          <HoverMetaChip
                            repoId={repo.id}
                            label="Languages"
                            kind="languages"
                            iconClassName="opacity-100 text-[#2563EB]"
                            className={cn(CHIP_BASE, CHIP.languages)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function KpiStatCard({
  label,
  value,
  hint,
  tone,
  emphasize = false,
  active = false,
  onClick,
}: {
  label: string;
  value: string | number;
  hint: string;
  tone: 'repos' | 'score' | 'smells' | 'critical';
  emphasize?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  const surface = {
    repos: 'bg-[#2563EB] shadow-[0_8px_24px_rgba(37,99,235,0.35)]',
    score: 'bg-[#10B981] shadow-[0_8px_24px_rgba(16,185,129,0.35)]',
    smells: 'bg-[#F59E0B] shadow-[0_8px_24px_rgba(245,158,11,0.35)]',
    critical: 'bg-[#EF4444] shadow-[0_8px_24px_rgba(239,68,68,0.35)]',
  }[tone];

  const className = cn(
    'rounded-xl border-0 p-4 text-left text-white transition-all duration-150 ease-out',
    surface,
    onClick
      ? 'cursor-pointer hover:-translate-y-1 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50'
      : 'hover:-translate-y-1 hover:brightness-110',
    emphasize && tone === 'critical' ? 'ring-2 ring-white/40' : null,
    active ? 'ring-2 ring-white shadow-[0_0_0_3px_rgba(255,255,255,0.25),0_10px_28px_rgba(239,68,68,0.45)]' : null
  );

  const body = (
    <>
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/85">{label}</p>
      <p className="mt-2 text-[32px] font-bold leading-none tracking-tight tabular-nums text-white">
        {value}
      </p>
      <p className="mt-2 text-[12px] leading-4 text-white/75">{hint}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        onClick={onClick}
        aria-pressed={active}
        data-testid="kpi-needs-attention"
      >
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}
