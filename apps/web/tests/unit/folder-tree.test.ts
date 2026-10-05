import { describe, expect, it } from 'vitest';
import type { ModuleSummaryDto } from '@archlens/shared-types';
import { buildFolderTree, moduleFolderPath, moduleIdForPath } from '@/lib/architecture/folder-tree';

const modules: ModuleSummaryDto[] = [
  {
    id: 'mod-core',
    name: 'src/core',
    fileCount: 2,
    virtual: false,
    filePaths: ['src/core/index.ts', 'src/core/util.ts'],
  },
  {
    id: 'mod-empty',
    name: 'docs',
    fileCount: 0,
    virtual: false,
    filePaths: [],
  },
];

describe('buildFolderTree', () => {
  it('nests files under folders and keeps module ids on leaves', () => {
    const root = buildFolderTree(modules);
    const src = root.children.find((child) => child.name === 'src');
    const core = src?.children.find((child) => child.name === 'core');
    const index = core?.children.find((child) => child.name === 'index.ts');
    expect(index?.kind).toBe('file');
    expect(index?.moduleId).toBe('mod-core');
    expect(root.children.some((child) => child.name === 'docs')).toBe(true);
  });

  it('resolves a file path back to its module', () => {
    expect(moduleIdForPath(modules, 'src/core/util.ts')).toBe('mod-core');
    expect(moduleIdForPath(modules, 'src/core')).toBe('mod-core');
  });

  it("uses the shared folder of a module's files", () => {
    expect(moduleFolderPath(modules[0]!)).toBe('src/core');
    expect(moduleFolderPath(modules[1]!)).toBe('docs');
  });
});
