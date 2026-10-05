'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, List, Maximize2, Minimize2, Network, Search } from 'lucide-react';
import cytoscape, { type Core } from 'cytoscape';
import type { ArchitectureDto, ReportModuleScoreDto } from '@archlens/shared-types';
import { buildFileSubgraph, type FileGraphNode } from '@/lib/architecture/file-graph';
import { scoreToGrade } from '@/lib/utils/grade';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

const GRADE_FILL: Record<string, string> = {
  A: '#22c55e',
  B: '#22c55e',
  C: '#d97706',
  D: '#ef4444',
  E: '#ef4444',
};

interface ArchitectureGraph2DProps {
  architecture: ArchitectureDto;
  modules: ReportModuleScoreDto[];
  selectedModuleId: string | null;
  selectedPath: string | null;
  drilledModuleId: string | null;
  onDrillModule: (moduleId: string) => void;
  onSelectFile: (path: string) => void;
  onExitDrill: () => void;
}

function nodeColor(mod: ReportModuleScoreDto | undefined, grade?: string): string {
  if (mod?.scoreBreakdown?.overall != null) {
    return GRADE_FILL[scoreToGrade(mod.scoreBreakdown.overall)] ?? '#64748b';
  }
  if (grade && GRADE_FILL[grade]) return GRADE_FILL[grade];
  if ((mod?.smellCount ?? 0) >= 8) return GRADE_FILL.E;
  if ((mod?.smellCount ?? 0) >= 4) return GRADE_FILL.C;
  return '#64748b';
}

function resolvedThemeColor(container: HTMLElement, property: string, fallback: string): string {
  const value = getComputedStyle(container).getPropertyValue(property).trim();
  if (!value) return fallback;
  if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')) return value;
  return `hsl(${value})`;
}

export function ArchitectureGraph2D({
  architecture,
  modules,
  selectedModuleId,
  selectedPath,
  drilledModuleId,
  onDrillModule,
  onSelectFile,
  onExitDrill,
}: ArchitectureGraph2DProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const drillRef = useRef(onDrillModule);
  const selectFileRef = useRef(onSelectFile);
  const [query, setQuery] = useState('');
  const [showList, setShowList] = useState(false);
  const [compact, setCompact] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  drillRef.current = onDrillModule;
  selectFileRef.current = onSelectFile;

  useEffect(() => {
    setQuery('');
  }, [drilledModuleId]);

  const moduleDetails = useMemo(() => {
    const byIrId = new Map(modules.map((mod) => [mod.irModuleId || mod.id, mod]));
    return architecture.modules.map((mod) => {
      const scoreModule = byIrId.get(mod.id);
      const grade =
        scoreModule?.scoreBreakdown?.overall != null
          ? scoreToGrade(scoreModule.scoreBreakdown.overall)
          : mod.grade;
      return {
        ...mod,
        grade: grade ?? 'Unrated',
        color: nodeColor(scoreModule, mod.grade),
        smellCount: scoreModule?.smellCount ?? 0,
      };
    });
  }, [architecture.modules, modules]);

  const drilledModule = architecture.modules.find((mod) => mod.id === drilledModuleId) ?? null;
  const fileSubgraph = useMemo(() => {
    if (!drilledModuleId) return null;
    return buildFileSubgraph(
      drilledModuleId,
      architecture.modules,
      architecture.fileEdges,
      architecture.edges
    );
  }, [architecture.edges, architecture.fileEdges, architecture.modules, drilledModuleId]);

  const listItems = useMemo(() => {
    if (fileSubgraph) {
      const normalized = query.trim().toLowerCase();
      return fileSubgraph.nodes.filter((node) => {
        if (!normalized) return true;
        return (
          node.label.toLowerCase().includes(normalized) ||
          (node.path ?? '').toLowerCase().includes(normalized)
        );
      });
    }
    const normalized = query.trim().toLowerCase();
    if (!normalized) return moduleDetails;
    return moduleDetails.filter((mod) => mod.name.toLowerCase().includes(normalized));
  }, [fileSubgraph, moduleDetails, query]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const foreground = resolvedThemeColor(container, '--foreground', '#0f172a');
    const card = resolvedThemeColor(container, '--card', '#ffffff');
    const border = resolvedThemeColor(container, '--border', '#d6dee8');
    const primary = resolvedThemeColor(container, '--primary', '#2563eb');
    const muted = resolvedThemeColor(container, '--muted-foreground', '#64748b');

    const colorByModule = new Map(moduleDetails.map((mod) => [mod.id, mod.color]));

    const elements = fileSubgraph
      ? [
          ...fileSubgraph.nodes.map((node) => ({
            data: {
              id: node.id,
              label: node.label,
              riskColor: colorByModule.get(node.moduleId) ?? '#64748b',
              kind: node.kind,
              path: node.path ?? '',
              moduleId: node.moduleId,
            },
          })),
          ...fileSubgraph.edges.map((edge, index) => ({
            data: {
              id: `${edge.from}->${edge.to}-${index}`,
              source: edge.from,
              target: edge.to,
            },
          })),
        ]
      : [
          ...moduleDetails.map((mod) => ({
            data: {
              id: mod.id,
              label: mod.name.split('/').pop() ?? mod.name,
              riskColor: mod.color,
              kind: 'module',
              path: '',
              moduleId: mod.id,
            },
          })),
          ...architecture.edges
            .filter(
              (edge) =>
                architecture.modules.some((m) => m.id === edge.from) &&
                architecture.modules.some((m) => m.id === edge.to)
            )
            .map((edge, index) => ({
              data: {
                id: `${edge.from}->${edge.to}-${index}`,
                source: edge.from,
                target: edge.to,
              },
            })),
        ];

    const nodeCount = fileSubgraph ? fileSubgraph.nodes.length : architecture.modules.length;
    const cy = cytoscape({
      container,
      elements,
      layout: {
        name: nodeCount > 40 ? 'cose' : 'breadthfirst',
        directed: true,
        padding: 24,
        spacingFactor: fileSubgraph ? 1.05 : 1.15,
        animate: false,
      },
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'background-color': card,
            color: foreground,
            'font-size': fileSubgraph ? '11px' : '13px',
            'font-weight': 600,
            'text-valign': 'center',
            'text-halign': 'center',
            width: fileSubgraph ? '96px' : '88px',
            height: fileSubgraph ? '32px' : '36px',
            shape: 'round-rectangle',
            'text-wrap': 'ellipsis',
            'text-max-width': fileSubgraph ? '88px' : '80px',
            'border-width': 3,
            'border-color': 'data(riskColor)',
          },
        },
        {
          selector: 'node[kind = "external-file"]',
          style: {
            'border-style': 'dashed',
            color: muted,
            'font-weight': 500,
          },
        },
        {
          selector: 'node[kind = "external-module"]',
          style: {
            shape: 'round-rectangle',
            'background-color': border,
            'font-size': '12px',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 3,
            'border-color': primary,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.25,
            'line-color': border,
            'target-arrow-color': border,
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 0.7,
          },
        },
      ],
      minZoom: 0.3,
      maxZoom: 2.4,
      wheelSensitivity: 0.25,
    });

    cy.on('tap', 'node', (event) => {
      const kind = String(event.target.data('kind') ?? '');
      const id = event.target.id();
      const path = String(event.target.data('path') ?? '');
      const moduleId = String(event.target.data('moduleId') ?? '');
      if (kind === 'module') {
        drillRef.current(id);
        return;
      }
      if (kind === 'external-module' && moduleId) {
        drillRef.current(moduleId);
        return;
      }
      if (path) selectFileRef.current(path);
    });
    cy.on('tap', (event) => {
      if (event.target === cy) return;
    });

    cyRef.current = cy;
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [architecture, fileSubgraph, moduleDetails]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().unselect();
    const selectedId = fileSubgraph ? selectedPath : selectedModuleId;
    if (selectedId) cy.getElementById(selectedId).select();
  }, [fileSubgraph, selectedModuleId, selectedPath]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const matchingIds = new Set(
      fileSubgraph
        ? (listItems as FileGraphNode[]).map((node) => node.id)
        : (listItems as typeof moduleDetails).map((mod) => mod.id)
    );
    cy.batch(() => {
      cy.nodes().forEach((node) => {
        node.style('display', matchingIds.has(node.id()) ? 'element' : 'none');
      });
      cy.edges().forEach((edge) => {
        const visible = matchingIds.has(edge.source().id()) && matchingIds.has(edge.target().id());
        edge.style('display', visible ? 'element' : 'none');
      });
    });
    if (query.trim() && matchingIds.size > 0) {
      cy.fit(
        cy.nodes().filter((node) => matchingIds.has(node.id())),
        36
      );
    } else if (!query.trim()) {
      cy.fit(cy.elements(), 24);
    }
  }, [fileSubgraph, listItems, query]);

  useEffect(() => {
    const onFullscreenChange = () =>
      setIsFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  async function toggleFullscreen() {
    if (document.fullscreenElement === rootRef.current) {
      await document.exitFullscreen();
    } else {
      await rootRef.current?.requestFullscreen();
    }
  }

  function onListClick(id: string, kind?: string, path?: string) {
    if (!fileSubgraph || kind === 'module') {
      onDrillModule(id);
      return;
    }
    if (kind === 'external-module') {
      onDrillModule(id);
      return;
    }
    if (path) onSelectFile(path);
  }

  const drilledName = drilledModule?.name.split('/').pop() ?? drilledModule?.name;

  return (
    <div
      ref={rootRef}
      className={cn(
        'flex min-h-0 flex-col rounded-xl border border-border/80 bg-card',
        compact ? 'h-[360px]' : 'h-full',
        isFullscreen && 'h-full rounded-none p-3'
      )}
      data-testid="architecture-graph-2d"
    >
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        {drilledModule ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="px-2"
            onClick={onExitDrill}
            data-testid="architecture-graph-back"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Modules</span>
          </Button>
        ) : null}
        <h3 className="mr-auto text-sm font-semibold tracking-tight">
          {drilledModule ? (
            <span>
              File connections
              <span className="ml-1.5 font-medium text-muted-foreground">/ {drilledName}</span>
            </span>
          ) : (
            'Dependency map'
          )}
        </h3>
        <label className="relative min-w-[160px] flex-1 sm:max-w-[240px]">
          <span className="sr-only">
            {drilledModule ? 'Search files in this module' : 'Search architecture modules'}
          </span>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={drilledModule ? 'Search files' : 'Search modules'}
            className="h-11 w-full rounded-md border border-border bg-background pl-8 pr-3 text-body text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring md:h-9"
          />
        </label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="px-2.5 motion-reduce:transition-none motion-reduce:active:scale-100"
          onClick={() => setShowList((current) => !current)}
          aria-pressed={showList}
          data-testid="architecture-graph-list-toggle"
          title={showList ? 'Show graph' : 'Show text list'}
        >
          {showList ? <Network className="h-4 w-4" /> : <List className="h-4 w-4" />}
          <span className="hidden xl:inline">{showList ? 'Graph' : 'List'}</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="px-2.5 motion-reduce:transition-none motion-reduce:active:scale-100"
          onClick={() => setCompact((current) => !current)}
          aria-pressed={compact}
        >
          {compact ? 'Expand' : 'Compact'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="px-2.5 motion-reduce:transition-none motion-reduce:active:scale-100"
          onClick={() => void toggleFullscreen()}
          title={isFullscreen ? 'Exit fullscreen' : 'Open fullscreen'}
          aria-label={
            isFullscreen ? 'Exit fullscreen architecture view' : 'Open fullscreen architecture view'
          }
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <div
          ref={containerRef}
          className={cn(
            'min-h-[280px] flex-1 motion-reduce:scroll-auto lg:min-h-0',
            showList && 'hidden'
          )}
          role="application"
          aria-label={
            drilledModule
              ? `File connections inside ${drilledName}. Use the list view for keyboard selection.`
              : 'Architecture dependency graph. Click a module to see file connections. Use the list view for keyboard selection.'
          }
        />
        {showList ? (
          <ul
            className="min-h-[280px] flex-1 overflow-y-auto p-2"
            aria-label={drilledModule ? 'Files in module' : 'Architecture modules'}
          >
            {listItems.length === 0 ? (
              <li className="px-2 py-4 text-sm text-muted-foreground">
                {drilledModule ? 'No files match this search.' : 'No modules match this search.'}
              </li>
            ) : fileSubgraph ? (
              (listItems as FileGraphNode[]).map((node) => (
                <li key={node.id}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-body hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      selectedPath === node.path && 'bg-accent text-accent-foreground'
                    )}
                    onClick={() => onListClick(node.id, node.kind, node.path)}
                  >
                    <span className="min-w-0 truncate font-medium">{node.label}</span>
                    <span className="shrink-0 text-metadata text-muted-foreground">
                      {node.kind === 'file'
                        ? 'in module'
                        : node.kind === 'external-file'
                          ? 'imports'
                          : 'module'}
                    </span>
                  </button>
                </li>
              ))
            ) : (
              (listItems as typeof moduleDetails).map((mod) => (
                <li key={mod.id}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-body hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      selectedModuleId === mod.id && 'bg-accent text-accent-foreground'
                    )}
                    onClick={() => onDrillModule(mod.id)}
                    aria-pressed={selectedModuleId === mod.id}
                  >
                    <span className="min-w-0 truncate font-medium">{mod.name}</span>
                    <span className="shrink-0 text-metadata text-muted-foreground">
                      Grade {mod.grade} · {mod.fileCount} files
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-1.5 text-metadata text-muted-foreground">
        <p>
          {fileSubgraph
            ? `${fileSubgraph.internalCount} files · ${fileSubgraph.connectionCount} connections${fileSubgraph.truncated ? ' · showing top 80' : ''}`
            : `${moduleDetails.length} of ${architecture.modules.length} modules · ${architecture.edges.length} edges`}
        </p>
        <p aria-label="Node border legend">
          {fileSubgraph
            ? 'Solid = files in this module · dashed = imported files · filled = other modules'
            : 'Click a module to open file connections · Border grade: '}
          {fileSubgraph ? null : (
            <>
              <span className="text-success">A–B healthy</span> ·{' '}
              <span className="text-warning">C watch</span> ·{' '}
              <span className="text-risk">D–E attention</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
