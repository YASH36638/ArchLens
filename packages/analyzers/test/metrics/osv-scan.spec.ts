import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { scanOsvVulnerabilities } from '../../src/metrics/smells/osv-scan.js';

const originalFetch = globalThis.fetch;

async function withTempRepo(
  setup: (root: string) => Promise<void>,
  run: (root: string) => Promise<void>
): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'archlens-osv-'));
  try {
    await setup(root);
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe('scanOsvVulnerabilities', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns null vulnerableScore when no lockfile packages are resolved', async () => {
    await withTempRepo(
      async (root) => {
        await writeFile(path.join(root, 'README.md'), '# demo\n');
      },
      async (root) => {
        const result = await scanOsvVulnerabilities(root);
        expect(result.smells).toHaveLength(0);
        expect(result.vulnerableScore).toBeNull();
      }
    );
  });

  it('maps OSV batch results to smells and score', async () => {
    globalThis.fetch = vi.fn(async () =>
      Response.json({
        results: [
          {
            vulns: [
              {
                id: 'GHSA-xxxx-yyyy-zzzz',
                severity: [{ type: 'CVSS_V3', score: '9.8' }],
              },
            ],
          },
        ],
      })
    ) as typeof fetch;

    await withTempRepo(
      async (root) => {
        await writeFile(
          path.join(root, 'package-lock.json'),
          JSON.stringify({
            packages: {
              'node_modules/lodash': { version: '4.17.20' },
            },
          })
        );
      },
      async (root) => {
        const result = await scanOsvVulnerabilities(root);
        expect(result.vulnerableScore).toBe(75);
        expect(result.hasCriticalVulnerability).toBe(true);
        expect(result.smells).toHaveLength(1);
        expect(result.smells[0]?.kind).toBe('vulnerable-dependency');
        expect(result.smells[0]?.message).toContain('lodash@4.17.20');
        expect(result.smells[0]?.message).toContain('GHSA-xxxx-yyyy-zzzz');
      }
    );
  });

  it('returns null vulnerableScore on fetch timeout', async () => {
    globalThis.fetch = vi.fn(
      () =>
        new Promise((_resolve, reject) => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        })
    ) as typeof fetch;

    await withTempRepo(
      async (root) => {
        await writeFile(path.join(root, 'requirements.txt'), 'requests==2.28.0\n');
      },
      async (root) => {
        const result = await scanOsvVulnerabilities(root);
        expect(result.vulnerableScore).toBeNull();
        expect(result.smells).toHaveLength(0);
      }
    );
  });
});
