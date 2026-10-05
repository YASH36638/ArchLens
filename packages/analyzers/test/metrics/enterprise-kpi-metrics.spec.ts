import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { measureEnterpriseKpis } from '../../src/metrics/enterprise-kpi-metrics.js';

async function withTempRepo(
  setup: (root: string) => Promise<void>,
  run: (root: string) => Promise<void>
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'archlens-kpi-'));
  try {
    await setup(root);
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe('measureEnterpriseKpis', () => {
  it('scores documentation coverage from category completeness not mere presence', async () => {
    await withTempRepo(
      async (root) => {
        await mkdir(path.join(root, 'docs'));
        await writeFile(
          path.join(root, 'docs', 'architecture.md'),
          '# System Architecture\n\nModule map and C4 overview.\n'
        );
        await writeFile(
          path.join(root, 'docs', 'getting-started.md'),
          '# Developer Setup\n\nInstall dependencies and run locally.\n'
        );
        await writeFile(
          path.join(root, 'docs', 'openapi.yaml'),
          'openapi: 3.0.0\ninfo:\n  title: Demo\n'
        );
        await writeFile(path.join(root, 'README.md'), '# Demo\n');
      },
      async (root) => {
        const kpi = await measureEnterpriseKpis({ repoPath: root });
        // architecture + setup + api = 3/6 → 50
        expect(kpi.documentationCoverage).toBe(50);
      }
    );
  });

  it('scores README quality from required sections', async () => {
    await withTempRepo(
      async (root) => {
        await writeFile(
          path.join(root, 'README.md'),
          `# Demo App

## Overview
What this project does.

## Installation
npm install

## Configuration
Set DATABASE_URL.

## Usage
npm start

## Architecture
Layered modules.
`
        );
      },
      async (root) => {
        const kpi = await measureEnterpriseKpis({ repoPath: root });
        // 5 of 8 sections → 63
        expect(kpi.readmeQuality).toBe(63);
      }
    );
  });

  it('returns 0 README quality when README is missing', async () => {
    await withTempRepo(
      async (root) => {
        await writeFile(path.join(root, 'index.js'), 'export const ok = true;\n');
      },
      async (root) => {
        const kpi = await measureEnterpriseKpis({ repoPath: root });
        expect(kpi.readmeQuality).toBe(0);
      }
    );
  });

  it('scores lockfile and linting independently as 50+50', async () => {
    await withTempRepo(
      async (root) => {
        await writeFile(path.join(root, 'package.json'), JSON.stringify({ dependencies: {} }));
        await writeFile(path.join(root, 'package-lock.json'), '{}');
        await writeFile(path.join(root, '.eslintrc.json'), '{}');
        await writeFile(path.join(root, 'README.md'), '# x\n');
      },
      async (root) => {
        const kpi = await measureEnterpriseKpis({ repoPath: root });
        expect(kpi.lockfileLinting).toBe(100);
      }
    );
  });

  it('scores lockfile-only as 50', async () => {
    await withTempRepo(
      async (root) => {
        await writeFile(path.join(root, 'package.json'), JSON.stringify({ dependencies: {} }));
        await writeFile(path.join(root, 'package-lock.json'), '{}');
        await writeFile(path.join(root, 'README.md'), '# x\n');
      },
      async (root) => {
        const kpi = await measureEnterpriseKpis({ repoPath: root });
        expect(kpi.lockfileLinting).toBe(50);
      }
    );
  });

  it('computes unused dependency percent bands from declared vs imported', async () => {
    await withTempRepo(
      async (root) => {
        await writeFile(
          path.join(root, 'package.json'),
          JSON.stringify({
            dependencies: {
              express: '4.18.2',
              leftpad: '1.0.0',
              lodash: '4.17.21',
            },
          })
        );
        await writeFile(path.join(root, 'package-lock.json'), '{}');
        await writeFile(path.join(root, 'index.js'), "import express from 'express';\n");
        await writeFile(path.join(root, 'README.md'), '# x\n');
      },
      async (root) => {
        const kpi = await measureEnterpriseKpis({ repoPath: root });
        // 2/3 unused ≈ 66% → band 25
        expect(kpi.unusedDependencies).toBe(25);
      }
    );
  });

  it('penalizes clean tree for backup and temp files', async () => {
    await withTempRepo(
      async (root) => {
        await writeFile(path.join(root, 'README.md'), '# x\n');
        await writeFile(path.join(root, 'app.js'), 'console.log(1);\n');
        await writeFile(path.join(root, 'app.js.bak'), 'old\n');
        await mkdir(path.join(root, 'backup'));
        await writeFile(path.join(root, 'backup', 'data.txt'), 'x\n');
      },
      async (root) => {
        const kpi = await measureEnterpriseKpis({ repoPath: root });
        expect(kpi.cleanTree).toBeLessThan(100);
        expect(kpi.cleanTree).toBeGreaterThanOrEqual(0);
      }
    );
  });

  it('scores secrets exposure from finding counts', async () => {
    await withTempRepo(
      async (root) => {
        await writeFile(path.join(root, 'README.md'), '# x\n');
      },
      async (root) => {
        const clean = await measureEnterpriseKpis({ repoPath: root, secretFindings: 0 });
        const one = await measureEnterpriseKpis({ repoPath: root, secretFindings: 1 });
        expect(clean.secretsExposure).toBe(100);
        expect(one.secretsExposure).toBe(75);
      }
    );
  });

  it('uses deny-list fallback for approved libraries when catalog unset', async () => {
    await withTempRepo(
      async (root) => {
        await writeFile(
          path.join(root, 'package.json'),
          JSON.stringify({
            dependencies: {
              express: '4.18.2',
              'left-pad': '1.0.0',
            },
          })
        );
        await writeFile(path.join(root, 'index.js'), "import express from 'express';\n");
        await writeFile(path.join(root, 'README.md'), '# x\n');
      },
      async (root) => {
        const kpi = await measureEnterpriseKpis({ repoPath: root });
        // 1 of 2 denied → 50% approved
        expect(kpi.approvedLibraries).toBe(50);
      }
    );
  });

  it('scores license compliance from LICENSE content', async () => {
    await withTempRepo(
      async (root) => {
        await writeFile(path.join(root, 'README.md'), '# x\n');
        await writeFile(path.join(root, 'LICENSE'), 'MIT License\nCopyright (c) 2026\n');
      },
      async (root) => {
        const kpi = await measureEnterpriseKpis({ repoPath: root });
        expect(kpi.licenseCompliance).toBe(100);
      }
    );
  });
});
