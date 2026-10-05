import type { ModuleSummaryDto } from '@archlens/shared-types';

export interface FolderTreeNode {
  id: string;
  name: string;
  path: string;
  kind: 'folder' | 'file';
  moduleId?: string;
  children: FolderTreeNode[];
}

function normalizePath(raw: string): string {
  return raw.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');
}

function insertPath(
  root: FolderTreeNode,
  rawPath: string,
  moduleId: string,
  kind: 'folder' | 'file'
) {
  const parts = normalizePath(rawPath).split('/').filter(Boolean);
  if (parts.length === 0) return;

  let cursor = root;
  let acc = '';
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    acc = acc ? `${acc}/${part}` : part;
    const isLeaf = i === parts.length - 1;
    let next = cursor.children.find((child) => child.name === part);
    if (!next) {
      next = {
        id: acc,
        name: part,
        path: acc,
        kind: isLeaf ? kind : 'folder',
        children: [],
      };
      cursor.children.push(next);
    }
    if (isLeaf) {
      next.kind = kind;
      next.moduleId = moduleId;
    }
    cursor = next;
  }
}

export function buildFolderTree(modules: ModuleSummaryDto[]): FolderTreeNode {
  const root: FolderTreeNode = {
    id: 'root',
    name: 'repository',
    path: '',
    kind: 'folder',
    children: [],
  };

  for (const mod of modules) {
    const paths = mod.filePaths?.length ? mod.filePaths : [mod.name];
    const leafKind = mod.filePaths?.length ? 'file' : 'folder';
    for (const path of paths) {
      insertPath(root, path, mod.id, leafKind);
    }
  }

  sortTree(root);
  return root;
}

function sortTree(node: FolderTreeNode) {
  node.children.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const child of node.children) sortTree(child);
}

export function findNodeByPath(root: FolderTreeNode, path: string): FolderTreeNode | null {
  if (!path) return root;
  const normalized = normalizePath(path);
  let cursor: FolderTreeNode | undefined = root;
  for (const part of normalized.split('/').filter(Boolean)) {
    cursor = cursor.children.find((child) => child.name === part);
    if (!cursor) return null;
  }
  return cursor;
}

export function moduleIdForPath(modules: ModuleSummaryDto[], path: string): string | null {
  const normalized = normalizePath(path);
  for (const mod of modules) {
    if (
      mod.filePaths?.some(
        (file) =>
          normalizePath(file) === normalized || normalizePath(file).startsWith(`${normalized}/`)
      )
    ) {
      return mod.id;
    }
    if (
      normalizePath(mod.name) === normalized ||
      normalized.startsWith(`${normalizePath(mod.name)}/`)
    ) {
      return mod.id;
    }
  }
  return null;
}

/** Shared parent folder of a module's files, or the module name. */
export function moduleFolderPath(mod: ModuleSummaryDto): string {
  const dirs = (mod.filePaths ?? [])
    .map((file) => {
      const normalized = normalizePath(file);
      const slash = normalized.lastIndexOf('/');
      return slash === -1 ? '' : normalized.slice(0, slash);
    })
    .filter(Boolean);

  if (dirs.length === 0) return normalizePath(mod.name);

  let prefix = dirs[0]!;
  for (const dir of dirs) {
    while (prefix && dir !== prefix && !dir.startsWith(`${prefix}/`)) {
      const slash = prefix.lastIndexOf('/');
      prefix = slash === -1 ? '' : prefix.slice(0, slash);
    }
  }
  return prefix || normalizePath(mod.name);
}
