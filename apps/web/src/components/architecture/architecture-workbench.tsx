'use client';

import { useMemo, useState } from 'react';
import type { ArchitectureDto, ReportModuleScoreDto } from '@archlens/shared-types';
import type { Smell } from '@archlens/ir-schema';
import {
  buildFolderTree,
  moduleFolderPath,
  moduleIdForPath,
  type FolderTreeNode,
} from '@/lib/architecture/folder-tree';
import { ArchitectureGraph2D } from './architecture-graph-2d';
import { FolderTree } from './folder-tree';
import { SmellsPanel } from './smells-panel';

interface ArchitectureWorkbenchProps {
  architecture: ArchitectureDto;
  modules: ReportModuleScoreDto[];
  smells: Smell[];
}

export function ArchitectureWorkbench({
  architecture,
  modules,
  smells,
}: ArchitectureWorkbenchProps) {
  const tree = useMemo(() => buildFolderTree(architecture.modules), [architecture.modules]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [drilledModuleId, setDrilledModuleId] = useState<string | null>(null);

  const selectedModule = architecture.modules.find((mod) => mod.id === selectedModuleId) ?? null;
  const filterPath = selectedPath ?? selectedModule?.name ?? null;
  const filterLabel = selectedPath ?? selectedModule?.name ?? null;
  const topSmell = smells[0]?.kind ?? 'none';

  function drillInto(moduleId: string | null) {
    if (!moduleId) {
      setDrilledModuleId(null);
      return;
    }
    setDrilledModuleId(moduleId);
    setSelectedModuleId(moduleId);
    const mod = architecture.modules.find((item) => item.id === moduleId);
    setSelectedPath(mod ? moduleFolderPath(mod) : null);
  }

  function selectTreeNode(node: FolderTreeNode) {
    setSelectedPath(node.path);
    const moduleId = node.moduleId ?? moduleIdForPath(architecture.modules, node.path);
    setSelectedModuleId(moduleId);
    if (moduleId) setDrilledModuleId(moduleId);
  }

  function selectFile(path: string) {
    setSelectedPath(path);
    const moduleId = moduleIdForPath(architecture.modules, path);
    if (moduleId) setSelectedModuleId(moduleId);
  }

  function clear() {
    setSelectedPath(null);
    setSelectedModuleId(null);
    setDrilledModuleId(null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" data-testid="architecture-workbench">
      <p className="shrink-0 text-body text-muted-foreground">
        {architecture.modules.length} modules · {architecture.edges.length} edges · Top smell:{' '}
        <span className="text-foreground">{topSmell}</span>
      </p>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-[minmax(12rem,22%)_minmax(0,1fr)] lg:h-full lg:min-h-[480px] lg:grid-cols-[22%_minmax(0,1fr)_28%]">
        <div className="h-[280px] md:h-[420px] lg:h-full lg:min-h-0">
          <FolderTree root={tree} selectedPath={selectedPath} onSelect={selectTreeNode} />
        </div>
        <div className="h-[280px] md:h-[420px] lg:h-full lg:min-h-0">
          <ArchitectureGraph2D
            architecture={architecture}
            modules={modules}
            selectedModuleId={selectedModuleId}
            selectedPath={selectedPath}
            drilledModuleId={drilledModuleId}
            onDrillModule={drillInto}
            onSelectFile={selectFile}
            onExitDrill={() => setDrilledModuleId(null)}
          />
        </div>
        <div className="h-[240px] md:col-span-2 md:h-[280px] lg:col-span-1 lg:h-full lg:min-h-0">
          <SmellsPanel
            smells={smells}
            filterPath={filterPath}
            filterLabel={filterLabel}
            onClear={clear}
          />
        </div>
      </div>
    </div>
  );
}
