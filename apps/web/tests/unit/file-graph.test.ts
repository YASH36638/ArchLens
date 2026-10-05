import { describe, expect, it } from 'vitest';
import type { ModuleSummaryDto } from '@archlens/shared-types';
import { buildFileSubgraph } from '@/lib/architecture/file-graph';

const modules: ModuleSummaryDto[] = [
  {
    id: 'mod-cli',
    name: 'cli',
    fileCount: 3,
    virtual: false,
    filePaths: ['cli/index.ts', 'cli/commands/run.ts', 'cli/helpers/git.ts'],
  },
  {
    id: 'mod-lib',
    name: 'lib',
    fileCount: 1,
    virtual: false,
    filePaths: ['lib/api.ts'],
  },
];

describe('buildFileSubgraph', () => {
  it('shows internal files and their import edges', () => {
    const graph = buildFileSubgraph(
      'mod-cli',
      modules,
      [
        { from: 'cli/index.ts', to: 'cli/commands/run.ts', kind: 'import', weight: 1 },
        { from: 'cli/commands/run.ts', to: 'lib/api.ts', kind: 'import', weight: 1 },
      ],
      [{ from: 'mod-cli', to: 'mod-lib', kind: 'import', weight: 2 }]
    );

    expect(graph.internalCount).toBe(3);
    expect(graph.nodes.some((node) => node.id === 'cli/index.ts' && node.kind === 'file')).toBe(
      true
    );
    expect(
      graph.nodes.some((node) => node.id === 'lib/api.ts' && node.kind === 'external-file')
    ).toBe(true);
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        { from: 'cli/index.ts', to: 'cli/commands/run.ts' },
        { from: 'cli/commands/run.ts', to: 'lib/api.ts' },
      ])
    );
  });

  it('falls back to neighbor modules when file edges are missing', () => {
    const graph = buildFileSubgraph('mod-cli', modules, undefined, [
      { from: 'mod-cli', to: 'mod-lib', kind: 'import', weight: 2 },
    ]);
    expect(graph.nodes.some((node) => node.kind === 'file')).toBe(true);
    expect(
      graph.nodes.some((node) => node.id === 'mod-lib' && node.kind === 'external-module')
    ).toBe(true);
    expect(graph.connectionCount).toBeGreaterThan(0);
  });
});
