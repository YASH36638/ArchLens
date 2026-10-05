import type { Page } from '@playwright/test';
import type {
  ArchitectureDto,
  DashboardSummaryDto,
  HotspotDto,
  ReportModuleScoreDto,
  ReportSummaryDto,
  RepositoryDto,
  ScanDto,
} from '@archlens/shared-types';
import { enterpriseAssessmentFromReport } from '@archlens/shared-types';

export const SEED_REPO: RepositoryDto = {
  id: '11111111-1111-4111-8111-111111111111',
  provider: 'github',
  owner: 'acme',
  name: 'widgets',
  fullName: 'acme/widgets',
  defaultBranch: 'main',
  private: false,
  htmlUrl: 'https://github.com/acme/widgets',
  connectedAt: new Date('2026-04-15T12:00:00Z').toISOString(),
};

export const SEED_SCAN: ScanDto = {
  id: '22222222-2222-4222-8222-222222222222',
  repoId: SEED_REPO.id,
  status: 'completed',
  createdAt: new Date('2026-05-09T10:00:00Z').toISOString(),
  startedAt: new Date('2026-05-09T10:00:00Z').toISOString(),
  finishedAt: new Date('2026-05-09T10:01:30Z').toISOString(),
  reportId: '33333333-3333-4333-8333-333333333333',
  ref: 'main',
};

export const SEED_REPORT: ReportSummaryDto = {
  id: SEED_SCAN.reportId!,
  scanId: SEED_SCAN.id,
  repoId: SEED_REPO.id,
  ir_version: '1.0.0',
  grade: 'B',
  scoreBreakdown: {
    complexity: 78,
    duplication: 82,
    coupling: 70,
    cohesion: 85,
    smells: 72,
    overall: 77,
  },
  counts: { modules: 4, files: 42, classes: 30, functions: 120, smells: 9 },
  topSmells: [
    {
      id: 'smell-1',
      kind: 'god-class',
      ruleId: 'god-class',
      severity: 'major',
      message: 'Class UsersController is too large',
      file: 'src/api/users.ts',
      location: { startLine: 12, endLine: 40 },
    },
  ],
  presentSmellKinds: ['god-class'],
  enterpriseAssessment: enterpriseAssessmentFromReport(
    {
      complexity: 78,
      duplication: 82,
      coupling: 70,
      cohesion: 85,
      smells: 72,
      overall: 77,
    },
    ['god-class'],
    { hasNodeManifest: true, vulnerableScore: 100 }
  ),
  generatedAt: SEED_SCAN.finishedAt!,
};

export const SEED_MODULES: ReportModuleScoreDto[] = [
  {
    id: 'mod-1',
    irModuleId: 'mod-1',
    name: 'core',
    virtual: false,
    fileCount: 12,
    classCount: 8,
    functionCount: 40,
    smellCount: 2,
    totalLoc: 1200,
    totalComplexity: 80,
    avgComplexity: 6.7,
    maxComplexity: 18,
  },
  {
    id: 'mod-2',
    irModuleId: 'mod-2',
    name: 'api',
    virtual: false,
    fileCount: 18,
    classCount: 14,
    functionCount: 60,
    smellCount: 5,
    totalLoc: 2400,
    totalComplexity: 140,
    avgComplexity: 7.8,
    maxComplexity: 24,
  },
];

export const SEED_ARCHITECTURE: ArchitectureDto = {
  reportId: SEED_SCAN.reportId!,
  repoId: SEED_REPO.id,
  modules: [
    {
      id: 'mod-1',
      name: 'core',
      fileCount: 2,
      virtual: false,
      grade: 'B',
      filePaths: ['src/core/index.ts', 'src/core/util.ts'],
    },
    {
      id: 'mod-2',
      name: 'api',
      fileCount: 18,
      virtual: false,
      grade: 'C',
      filePaths: ['src/api/users.ts'],
    },
    {
      id: 'mod-3',
      name: 'web',
      fileCount: 9,
      virtual: false,
      grade: 'A',
      filePaths: ['src/web/app.ts'],
    },
  ],
  edges: [
    { from: 'mod-2', to: 'mod-1', kind: 'import', weight: 8 },
    { from: 'mod-3', to: 'mod-2', kind: 'import', weight: 5 },
    { from: 'mod-1', to: 'mod-2', kind: 'import', weight: 2 },
  ],
  fileEdges: [
    { from: 'src/core/index.ts', to: 'src/core/util.ts', kind: 'import', weight: 1 },
    { from: 'src/core/index.ts', to: 'src/api/users.ts', kind: 'import', weight: 1 },
  ],
  diagram: {
    format: 'mermaid',
    source: [
      'graph TD',
      '  core["core (12 files)"]',
      '  api["api (18 files)"]',
      '  web["web (9 files)"]',
      '  api --> core',
      '  web --> api',
      '  core --> api',
    ].join('\n'),
  },
  cycles: [['mod-1', 'mod-2']],
};

export const SEED_HOTSPOTS: HotspotDto[] = [
  {
    fileId: 'file-1',
    path: 'src/api/users.controller.ts',
    complexity: 28,
    churn: 14,
    riskScore: 9.2,
    smellCount: 4,
  },
  {
    fileId: 'file-2',
    path: 'src/core/billing-engine.ts',
    complexity: 41,
    churn: 6,
    riskScore: 7.8,
    smellCount: 3,
  },
  {
    fileId: 'file-3',
    path: 'src/web/dashboard.tsx',
    complexity: 12,
    churn: 3,
    riskScore: 2.1,
    smellCount: 1,
  },
];

/**
 * Intercepts API calls from the web app and serves seeded data.
 * Targets ARCHLENS_API_URL (server-side) and NEXT_PUBLIC_API_URL (client-side).
 */
export const SEED_DASHBOARD: DashboardSummaryDto = {
  hasCompletedScans: true,
  lastUpdatedAt: SEED_SCAN.finishedAt!,
  projectsScanned: {
    count: 1,
    previousCount: 1,
    deltaPercent: 0,
    connectedCount: 1,
  },
  issuesIdentified: {
    count: 9,
    previousCount: 11,
    deltaPercent: -18.18,
    criticalAndMajor: 3,
  },
  portfolioHealth: {
    score: 77,
    previousScore: 71,
    deltaPercent: 8.45,
    grade: 'C',
    repoCount: 1,
  },
  weekly: [
    {
      weekStart: '2026-04-20T00:00:00.000Z',
      label: 'Apr 20',
      avgScore: 71,
      avgSmells: 11,
      scanCount: 1,
    },
    {
      weekStart: '2026-05-04T00:00:00.000Z',
      label: 'May 4',
      avgScore: 77,
      avgSmells: 9,
      scanCount: 1,
    },
  ],
};

export async function mockArchlensApi(page: Page) {
  await page.route(/.*\/dashboard\/summary$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(SEED_DASHBOARD),
    });
  });

  await page.route(/.*\/repositories\/[^/]+\/meta$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        branches: ['main', 'develop'],
        languages: [],
        collaborators: [],
        contributors: [],
        reportsTo: null,
      }),
    });
  });

  await page.route(/.*\/repositories$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([SEED_REPO]),
    });
  });

  await page.route(/.*\/scans(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([SEED_SCAN]),
    });
  });

  await page.route(new RegExp(`.*/reports/${SEED_SCAN.id}$`), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(SEED_REPORT),
    });
  });

  await page.route(new RegExp(`.*/reports/${SEED_SCAN.id}/modules$`), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(SEED_MODULES),
    });
  });

  await page.route(new RegExp(`.*/architecture/${SEED_SCAN.id}$`), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(SEED_ARCHITECTURE),
    });
  });

  await page.route(new RegExp(`.*/hotspots/${SEED_SCAN.id}$`), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(SEED_HOTSPOTS),
    });
  });
}
