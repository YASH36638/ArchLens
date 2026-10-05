import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectRepoHygiene } from '../../src/metrics/smells/repo-hygiene.js';

async function withTempRepo(
  setup: (root: string) => Promise<void>,
  run: (root: string) => Promise<void>
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'archlens-hygiene-'));
  try {
    await setup(root);
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe('detectRepoHygiene', () => {
  it('flags missing README, license, docs, and lockfile', async () => {
    await withTempRepo(
      async (root) => {
        await writeFile(path.join(root, 'package.json'), JSON.stringify({ dependencies: {} }));
        await writeFile(path.join(root, 'index.js'), 'export const ok = true;\n');
      },
      async (root) => {
        const smells = await detectRepoHygiene({ repoPath: root }, { largeBinaryBytes: 1024 });
        const kinds = new Set(smells.map((s) => s.kind));
        expect(kinds.has('missing-readme')).toBe(true);
        expect(kinds.has('missing-license')).toBe(true);
        expect(kinds.has('missing-docs')).toBe(true);
        expect(kinds.has('missing-lockfile')).toBe(true);
      }
    );
  });

  it('flags hardcoded secrets and insecure API usage', async () => {
    await withTempRepo(
      async (root) => {
        await writeFile(path.join(root, 'README.md'), '# demo\n');
        await writeFile(path.join(root, 'LICENSE'), 'MIT\n');
        await mkdir(path.join(root, 'docs'));
        await writeFile(
          path.join(root, 'app.js'),
          "const token = 'ghp_abcdefghijklmnopqrstuvwxyz123456';\neval(userInput);\n"
        );
      },
      async (root) => {
        const smells = await detectRepoHygiene({ repoPath: root }, { largeBinaryBytes: 1024 });
        const kinds = new Set(smells.map((s) => s.kind));
        expect(kinds.has('hardcoded-secret')).toBe(true);
        expect(kinds.has('insecure-api')).toBe(true);
      }
    );
  });

  it('flags unused and unpinned production dependencies', async () => {
    await withTempRepo(
      async (root) => {
        await writeFile(path.join(root, 'README.md'), '# demo\n');
        await writeFile(path.join(root, 'LICENSE'), 'MIT\n');
        await mkdir(path.join(root, 'docs'));
        await writeFile(
          path.join(root, 'package.json'),
          JSON.stringify({
            dependencies: {
              leftpad: '*',
              express: '^4.18.2',
            },
          })
        );
        await writeFile(path.join(root, 'package-lock.json'), '{}');
        await writeFile(path.join(root, 'index.js'), "import express from 'express';\n");
      },
      async (root) => {
        const smells = await detectRepoHygiene({ repoPath: root }, { largeBinaryBytes: 1024 });
        const kinds = new Set(smells.map((s) => s.kind));
        expect(kinds.has('unused-dependency')).toBe(true);
        expect(kinds.has('unpinned-dependency')).toBe(true);
      }
    );
  });

  it('flags JS commented-out code in source walk', async () => {
    await withTempRepo(
      async (root) => {
        await writeFile(path.join(root, 'README.md'), '# demo\n');
        await writeFile(path.join(root, 'LICENSE'), 'MIT\n');
        await mkdir(path.join(root, 'docs'));
        await writeFile(
          path.join(root, 'app.ts'),
          [
            '// const legacy = oldValue;',
            '// function retired() { return 1; }',
            '// import fs from "node:fs";',
            'export const ok = true;',
          ].join('\n')
        );
      },
      async (root) => {
        const smells = await detectRepoHygiene({ repoPath: root }, { largeBinaryBytes: 1024 });
        const kinds = new Set(smells.map((s) => s.kind));
        expect(kinds.has('commented-out-code')).toBe(true);
      }
    );
  });
});
