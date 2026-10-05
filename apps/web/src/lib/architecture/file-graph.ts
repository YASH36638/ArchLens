import type { Edge } from '@archlens/ir-schema';
import type { ModuleSummaryDto } from '@archlens/shared-types';

export type FileGraphNodeKind = 'file' | 'external-file' | 'external-module';

export interface FileGraphNode {
  id: string;
  label: string;
  kind: FileGraphNodeKind;
  moduleId: string;
  path?: string;
}

export interface FileGraphEdge {
  from: string;
  to: string;
}

export interface FileSubgraph {
  nodes: FileGraphNode[];
  edges: FileGraphEdge[];
  truncated: boolean;
  internalCount: number;
  connectionCount: number;
}

const MAX_INTERNAL_FILES = 80;
const MAX_EXTERNAL_FILES = 24;

function basename(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const slash = normalized.lastIndexOf('/');
  return slash === -1 ? normalized : normalized.slice(slash + 1);
}

function normalize(path: string): string {
  return path.replace(/\\/g, '/');
}

function leafName(name: string): string {
  return name.split('/').pop() ?? name;
}

/**
 * File-level subgraph for a drilled module: internal files, their import
 * edges, and a capped set of external files. When file edges are missing
 * (older scans), neighbor modules are shown from the module graph instead.
 */
export function buildFileSubgraph(
  focusModuleId: string,
  modules: readonly ModuleSummaryDto[],
  fileEdges: readonly Edge[] | undefined,
  moduleEdges: readonly Edge[]
): FileSubgraph {
  const focus = modules.find((mod) => mod.id === focusModuleId);
  if (!focus) {
    return { nodes: [], edges: [], truncated: false, internalCount: 0, connectionCount: 0 };
  }

  const moduleByFile = new Map<string, ModuleSummaryDto>();
  for (const mod of modules) {
    for (const file of mod.filePaths ?? []) {
      moduleByFile.set(normalize(file), mod);
    }
  }

  const internalPaths = (focus.filePaths ?? []).map(normalize);
  const internalSet = new Set(internalPaths);
  const degree = new Map<string, number>();
  const bump = (path: string): void => {
    degree.set(path, (degree.get(path) ?? 0) + 1);
  };

  const relevant: Array<{ from: string; to: string }> = [];
  for (const edge of fileEdges ?? []) {
    const from = normalize(edge.from);
    const to = normalize(edge.to);
    if (!internalSet.has(from) && !internalSet.has(to)) continue;
    relevant.push({ from, to });
    if (internalSet.has(from)) bump(from);
    if (internalSet.has(to)) bump(to);
  }

  const rankedInternal = [...internalPaths].sort(
    (a, b) => (degree.get(b) ?? 0) - (degree.get(a) ?? 0) || a.localeCompare(b)
  );
  const truncated = rankedInternal.length > MAX_INTERNAL_FILES;
  const keptInternal = rankedInternal.slice(0, MAX_INTERNAL_FILES);
  const keptInternalSet = new Set(keptInternal);

  const nodes: FileGraphNode[] = keptInternal.map((path) => ({
    id: path,
    label: basename(path),
    kind: 'file',
    moduleId: focus.id,
    path,
  }));

  const edges: FileGraphEdge[] = [];
  const seenEdges = new Set<string>();
  const nodeIds = new Set(keptInternal);
  const addNode = (node: FileGraphNode): void => {
    if (nodeIds.has(node.id)) return;
    nodeIds.add(node.id);
    nodes.push(node);
  };
  const addEdge = (from: string, to: string): void => {
    if (from === to || !nodeIds.has(from) || !nodeIds.has(to)) return;
    const key = `${from}->${to}`;
    if (seenEdges.has(key)) return;
    seenEdges.add(key);
    edges.push({ from, to });
  };

  const externalCandidates: string[] = [];
  const seenExternal = new Set<string>();
  for (const edge of relevant) {
    const fromInternal = keptInternalSet.has(edge.from);
    const toInternal = keptInternalSet.has(edge.to);
    if (fromInternal && toInternal) {
      addEdge(edge.from, edge.to);
      continue;
    }
    const externalPath = fromInternal ? edge.to : toInternal ? edge.from : null;
    if (!externalPath || seenExternal.has(externalPath)) continue;
    seenExternal.add(externalPath);
    externalCandidates.push(externalPath);
  }

  const keptExternal = externalCandidates.slice(0, MAX_EXTERNAL_FILES);
  const overflow = externalCandidates.slice(MAX_EXTERNAL_FILES);
  for (const path of keptExternal) {
    const owner = moduleByFile.get(path);
    addNode({
      id: path,
      label: basename(path),
      kind: 'external-file',
      moduleId: owner?.id ?? focus.id,
      path,
    });
  }
  for (const path of overflow) {
    const owner = moduleByFile.get(path);
    if (!owner || owner.id === focus.id) continue;
    addNode({
      id: owner.id,
      label: leafName(owner.name),
      kind: 'external-module',
      moduleId: owner.id,
    });
  }

  for (const edge of relevant) {
    const resolve = (path: string): string | null => {
      if (keptInternalSet.has(path) || keptExternal.includes(path)) return path;
      const owner = moduleByFile.get(path);
      if (owner && owner.id !== focus.id && nodeIds.has(owner.id)) return owner.id;
      return null;
    };
    const from = resolve(edge.from);
    const to = resolve(edge.to);
    if (from && to) addEdge(from, to);
  }

  if (relevant.length === 0) {
    for (const edge of moduleEdges) {
      const neighborId = edge.from === focus.id ? edge.to : edge.to === focus.id ? edge.from : null;
      if (!neighborId || neighborId === focus.id) continue;
      const neighbor = modules.find((mod) => mod.id === neighborId);
      if (!neighbor) continue;
      addNode({
        id: neighbor.id,
        label: leafName(neighbor.name),
        kind: 'external-module',
        moduleId: neighbor.id,
      });
      if (edge.from === focus.id) {
        const source = keptInternal[0];
        if (source) addEdge(source, neighbor.id);
      } else {
        const target = keptInternal[0];
        if (target) addEdge(neighbor.id, target);
      }
    }
  }

  return {
    nodes,
    edges,
    truncated,
    internalCount: internalPaths.length,
    connectionCount: edges.length,
  };
}
