'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import type {
  MetricDefinitionDto,
  SmellCategory,
  SmellDefinitionDto,
} from '@archlens/shared-types';
import type { Severity } from '@archlens/ir-schema';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCatalogTabs } from '@/components/metrics/metric-catalog-tabs';
import { CollapsibleSection } from '@/components/glossary/collapsible-section';
import { cn } from '@/lib/utils/cn';

interface GlossaryClientProps {
  metrics: MetricDefinitionDto[];
  smells: SmellDefinitionDto[];
  initialTab: 'metrics' | 'smells';
}

const CATEGORY_ORDER: ReadonlyArray<SmellCategory> = [
  'design',
  'size',
  'complexity',
  'duplication',
  'coupling',
  'cohesion',
];

const CATEGORY_LABELS: Record<SmellCategory, string> = {
  design: 'Design',
  size: 'Size',
  complexity: 'Complexity',
  duplication: 'Duplication',
  coupling: 'Coupling',
  cohesion: 'Cohesion',
};

const SEVERITY_TONE: Record<Severity, string> = {
  info: 'border-border bg-muted/60 text-muted-foreground',
  minor: 'border-warning/30 bg-warning/10 text-warning',
  major: 'border-warning/40 bg-warning/15 text-warning',
  critical: 'border-risk/30 bg-risk/10 text-risk',
};

export function GlossaryClient({ metrics, smells, initialTab }: GlossaryClientProps) {
  const [tab, setTab] = useState<'metrics' | 'smells'>(initialTab);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setTab(searchParams.get('tab') === 'smells' ? 'smells' : 'metrics');
  }, [searchParams]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function selectTab(nextTab: 'metrics' | 'smells') {
    setTab(nextTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', nextTab);
    if (nextTab === 'smells') params.delete('metric');
    const hash = nextTab === 'smells' ? window.location.hash : '';
    router.replace(`${pathname}?${params.toString()}${hash}`, { scroll: false });
  }

  const q = query.trim().toLowerCase();
  const metricHits = useMemo(
    () => (q ? metrics.filter((metric) => metricMatches(metric, q)).length : metrics.length),
    [metrics, q]
  );
  const smellHits = useMemo(
    () => (q ? smells.filter((smell) => smellMatches(smell, q)).length : smells.length),
    [smells, q]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" data-testid="glossary">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search glossary</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search metrics and smells…"
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-12 text-body text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground hover:border-primary/30 focus-visible:border-primary/40 focus-visible:shadow-search focus-visible:ring-2 focus-visible:ring-ring"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-muted/80 px-1.5 py-0.5 text-badge font-medium text-muted-foreground md:inline">
            /
          </kbd>
        </label>
        <div
          className="flex w-fit shrink-0 gap-0.5 rounded-md border border-border bg-muted/50 p-0.5"
          role="tablist"
          aria-label="Glossary catalog"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'metrics'}
            onClick={() => selectTab('metrics')}
            className={cn(
              'inline-flex min-h-9 items-center rounded-md px-3 text-navigation transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              tab === 'metrics'
                ? 'bg-card font-semibold text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Metrics
            {q ? (
              <span className="ml-1 tabular-nums text-muted-foreground">{metricHits}</span>
            ) : null}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'smells'}
            onClick={() => selectTab('smells')}
            className={cn(
              'inline-flex min-h-9 items-center rounded-md px-3 text-navigation transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              tab === 'smells'
                ? 'bg-card font-semibold text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Smells
            {q ? (
              <span className="ml-1 tabular-nums text-muted-foreground">{smellHits}</span>
            ) : null}
          </button>
        </div>
      </div>

      <p className="text-body text-muted-foreground">
        {metrics.length} metrics · {smells.length} smells
      </p>

      {tab === 'metrics' ? (
        metrics.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Catalog unavailable</CardTitle>
              <CardDescription>Could not load metric definitions.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <MetricCatalogTabs metrics={metrics} query={query} />
        )
      ) : smells.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Catalog unavailable</CardTitle>
            <CardDescription>Could not load smell definitions.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <SmellCatalog smells={smells} query={query} />
      )}
    </div>
  );
}

function SmellCatalog({ smells, query }: { smells: SmellDefinitionDto[]; query: string }) {
  const q = query.trim().toLowerCase();
  const orderedCategories = useMemo(() => {
    const byCategory = new Map<SmellCategory, SmellDefinitionDto[]>();
    for (const rule of smells) {
      if (q && !smellMatches(rule, q)) continue;
      const list = byCategory.get(rule.category);
      if (list) list.push(rule);
      else byCategory.set(rule.category, [rule]);
    }
    return CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((c) => ({
      category: c,
      rules: byCategory.get(c)!,
    }));
  }, [smells, q]);

  useEffect(() => {
    const id = window.location.hash.replace(/^#/, '');
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }, []);

  if (orderedCategories.length === 0) {
    return <p className="px-1 py-6 text-body text-muted-foreground">No matching smells.</p>;
  }

  return (
    <div className="grid min-h-0 gap-3 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:items-start">
      <nav className="hidden lg:sticky lg:top-0 lg:block" aria-label="Smell categories">
        <ul className="space-y-0.5">
          {orderedCategories.map(({ category, rules }) => (
            <li key={category}>
              <a
                href={`#smell-category-${category}`}
                className="flex min-h-9 items-center justify-between rounded-md px-2.5 py-1.5 text-body font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              >
                <span>{CATEGORY_LABELS[category]}</span>
                <span className="font-mono text-metadata tabular-nums">{rules.length}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 space-y-5">
        {orderedCategories.map(({ category, rules }) => (
          <section key={category} aria-labelledby={`smell-category-${category}`}>
            <h2
              id={`smell-category-${category}`}
              className="mb-2 scroll-mt-3 text-section-title text-foreground"
            >
              {CATEGORY_LABELS[category]}
            </h2>
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {rules.map((rule) => (
                <article
                  key={rule.ruleId}
                  id={rule.ruleId}
                  data-testid="smell-card"
                  className="scroll-mt-16 overflow-hidden rounded-lg border border-border bg-card shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2 px-4 pt-4">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold leading-6 text-foreground">
                        {rule.name}
                      </h3>
                      <p className="mt-1 text-body leading-6 text-muted-foreground">
                        {rule.shortDescription}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full border px-2 py-0.5 text-badge font-medium capitalize',
                        SEVERITY_TONE[rule.defaultSeverity]
                      )}
                    >
                      {rule.defaultSeverity}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 px-4">
                    <Badge variant="secondary" className="font-mono text-badge font-medium">
                      {rule.ruleId}
                    </Badge>
                    {rule.languages.map((lang) => (
                      <Badge key={lang} variant="outline" className="text-badge font-medium">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                  <div className="space-y-1.5 p-3 pt-3">
                    <CollapsibleSection title="Details">
                      <p className="text-body leading-6 text-muted-foreground">
                        {rule.description}
                      </p>
                    </CollapsibleSection>
                    <CollapsibleSection title="Remediation">
                      <p className="text-body leading-6 text-foreground">{rule.remediation}</p>
                    </CollapsibleSection>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function metricMatches(metric: MetricDefinitionDto, q: string): boolean {
  return [metric.name, metric.metricId, metric.shortDescription, metric.description]
    .join(' ')
    .toLowerCase()
    .includes(q);
}

function smellMatches(smell: SmellDefinitionDto, q: string): boolean {
  return [
    smell.name,
    smell.ruleId,
    smell.kind,
    smell.shortDescription,
    smell.description,
    smell.category,
  ]
    .join(' ')
    .toLowerCase()
    .includes(q);
}
