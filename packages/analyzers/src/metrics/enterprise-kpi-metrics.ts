import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { EnterpriseKpiMeasurements } from '@archlens/shared-types';
import {
  coveragePercent,
  DOC_CATEGORIES,
  README_SECTIONS,
  scoreApiSecurityFindings,
  scoreApprovedRatio,
  scoreDeadCodePercent,
  scoreOutdatedRatio,
  scoreSecretsFindings,
  scoreUnusedDependencyPercent,
  type DocCategory,
  type ReadmeSection,
} from '@archlens/shared-types';
import type { Edge, Module } from '../ir/types.js';

const README_NAMES = ['README.md', 'README.rst', 'README.txt', 'README'];
const LICENSE_NAMES = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'COPYING', 'COPYING.md'];

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.venv',
  'venv',
  '__pycache__',
  'dist',
  'build',
  '.next',
  '.turbo',
  '.cache',
  'coverage',
  '.idea',
  '.vscode',
]);

const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.java', '.kt']);

const ENTRYPOINT_RE = /(^|\/)(index|main|app|server|cli|__init__|program|bootstrap)(\.[a-z]+)?$/i;

const LINTER_CONFIGS = [
  '.eslintrc',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.json',
  '.eslintrc.yml',
  '.eslintrc.yaml',
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.cjs',
  'eslint.config.ts',
  '.prettierrc',
  '.prettierrc.js',
  '.prettierrc.cjs',
  '.prettierrc.json',
  '.prettierrc.yml',
  'prettier.config.js',
  'prettier.config.cjs',
  'prettier.config.mjs',
  'ruff.toml',
  '.flake8',
  'setup.cfg',
  'pyproject.toml',
  '.editorconfig',
];

const DOC_CATEGORY_PATTERNS: Record<DocCategory, RegExp[]> = {
  architecture: [
    /architect/i,
    /adr/i,
    /design[_\s-]?doc/i,
    /system[_\s-]?design/i,
    /c4/i,
    /module[_\s-]?map/i,
  ],
  api: [/openapi/i, /swagger/i, /asyncapi/i, /api[_\s-]?doc/i, /\/api\//i, /endpoints?/i],
  setup: [
    /contributing/i,
    /getting[_\s-]?started/i,
    /developer[_\s-]?setup/i,
    /local[_\s-]?dev/i,
    /install/i,
    /onboard/i,
  ],
  deployment: [/deploy/i, /helm/i, /kubernetes/i, /k8s/i, /terraform/i, /infra/i, /release/i],
  troubleshooting: [/troubleshoot/i, /faq/i, /known[_\s-]?issues/i, /debug/i],
  runbook: [/runbook/i, /operat/i, /sre/i, /oncall/i, /incident/i, /playbook/i],
};

const README_SECTION_PATTERNS: Record<ReadmeSection, RegExp[]> = {
  overview: [/^(overview|about|introduction|summary|what\s+is|project)\b/i],
  installation: [/^(install|getting\s+started|setup|quick\s*start|prerequisites)\b/i],
  configuration: [/^(config|configuration|environment|env\s*vars?|settings)\b/i],
  usage: [/^(usage|how\s+to\s+use|examples?|commands?|cli)\b/i],
  architecture: [/^(architecture|design|structure|modules?)\b/i],
  deployment: [/^(deploy|deployment|release|production|docker|k8s|kubernetes)\b/i],
  ownership: [/^(contribut|authors?|owners?|maintainers?|team|support|code\s+of\s+conduct)\b/i],
  troubleshooting: [/^(troubleshoot|faq|known\s+issues|debugging|common\s+problems)\b/i],
};

const APPROVED_LICENSE_RE =
  /\b(MIT|Apache(?:\s+License)?(?:\s*v?2(?:\.0)?)?|BSD(?:-[23]-Clause)?|ISC|MPL-2\.0|Unlicense)\b/i;

const DENIED_LICENSE_RE = /\b(GPL|AGPL|LGPL|SSPL|Commons\s+Clause)\b/i;

const RISK_PACKAGES = new Set([
  'request',
  'node-uuid',
  'event-stream',
  'colors',
  'faker',
  'serialize-javascript',
  'node-ipc',
  'left-pad',
]);

const TEMP_NAME_RE =
  /(\.tmp$|\.bak$|\.old$|\.orig$|~$|copy\s+of|\bbackup\b|\bold\b|\btemp\b|\btmp\b)/i;

const BACKUP_DIR_RE = /(^|\/)(backup|backups|old|tmp|temp|copy)(\/|$)/i;

export interface EnterpriseKpiInput {
  repoPath: string;
  modules?: Module[];
  fileEdges?: Edge[];
  /** Secret smell count from hygiene scan. */
  secretFindings?: number;
  /** Insecure-API smell count from hygiene scan. */
  insecureApiFindings?: number;
  /** Commented-out-code smell count (file-level). */
  commentedOutCodeFiles?: number;
  /** OSV continuous score; null when unavailable. */
  vulnerableScore?: number | null;
  /** True when OSV reported at least one critical CVE. */
  hasCriticalVulnerability?: boolean;
}

function deniedPackages(): Set<string> {
  const extra = process.env.ARCHLENS_DENIED_PACKAGES?.split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  if (!extra?.length) return RISK_PACKAGES;
  return new Set([...RISK_PACKAGES, ...extra]);
}

function approvedCatalog(): Set<string> | null {
  const raw = process.env.ARCHLENS_APPROVED_PACKAGES?.split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  if (!raw?.length) return null;
  return new Set(raw);
}

export async function measureEnterpriseKpis(
  input: EnterpriseKpiInput
): Promise<EnterpriseKpiMeasurements> {
  const root = path.resolve(input.repoPath);
  let rootNames = new Set<string>();
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    rootNames = new Set(entries.map((e) => e.name));
  } catch {
    rootNames = new Set();
  }

  const [
    documentationCoverage,
    readmeQuality,
    cleanTree,
    lockfileLinting,
    licenseCompliance,
    depMetrics,
    deadCode,
  ] = await Promise.all([
    measureDocumentationCoverage(root, rootNames),
    measureReadmeQuality(root, rootNames),
    measureCleanTree(root),
    measureLockfileLinting(root, rootNames),
    measureLicenseCompliance(root, rootNames),
    measureDependencyKpis(root, rootNames),
    measureDeadCode(root, input),
  ]);

  const secretsExposure = scoreSecretsFindings(input.secretFindings ?? 0);
  const apiSecurityRisk = scoreApiSecurityFindings(input.insecureApiFindings ?? 0);
  const vulnerableDependencies =
    typeof input.vulnerableScore === 'number' ? input.vulnerableScore : null;

  return {
    documentationCoverage,
    readmeQuality,
    deadCode,
    unusedDependencies: depMetrics.unusedScore,
    lockfileLinting,
    cleanTree,
    secretsExposure,
    vulnerableDependencies,
    hasCriticalVulnerability: Boolean(input.hasCriticalVulnerability),
    approvedLibraries: depMetrics.approvedScore,
    apiSecurityRisk,
    outdatedPackages: depMetrics.outdatedScore,
    licenseCompliance,
  };
}

async function measureDocumentationCoverage(root: string, rootNames: Set<string>): Promise<number> {
  const found = new Set<DocCategory>();
  const docRoots: string[] = [];
  for (const name of ['docs', 'documentation', 'doc']) {
    if (rootNames.has(name)) docRoots.push(path.join(root, name));
  }

  const classify = (text: string): void => {
    for (const category of DOC_CATEGORIES) {
      if (found.has(category)) continue;
      if (DOC_CATEGORY_PATTERNS[category].some((re) => re.test(text))) {
        found.add(category);
      }
    }
  };

  // Root-level guides
  for (const name of rootNames) {
    classify(name);
  }

  for (const docRoot of docRoots) {
    await walkPaths(docRoot, async (rel, abs, isDir) => {
      classify(rel);
      if (!isDir && /\.(md|mdx|rst|adoc|txt|ya?ml|json)$/i.test(rel)) {
        const text = await readTextCapped(abs, 32 * 1024);
        if (text) {
          classify(text.slice(0, 4000));
          for (const heading of extractMarkdownHeadings(text)) {
            classify(heading);
          }
        }
      }
    });
  }

  // OpenAPI / Swagger anywhere near root
  await walkPaths(
    root,
    async (rel) => {
      if (/openapi|swagger|asyncapi/i.test(rel)) classify(rel);
    },
    3
  );

  return coveragePercent(found.size, DOC_CATEGORIES.length);
}

async function measureReadmeQuality(root: string, rootNames: Set<string>): Promise<number> {
  const readmeName = README_NAMES.find((n) => rootNames.has(n));
  if (!readmeName) return 0;

  const text = await readTextCapped(path.join(root, readmeName), 256 * 1024);
  if (!text || text.trim().length < 40) return coveragePercent(0, README_SECTIONS.length);

  const headings = extractMarkdownHeadings(text);
  const present = new Set<ReadmeSection>();

  for (const heading of headings) {
    for (const section of README_SECTIONS) {
      if (present.has(section)) continue;
      if (README_SECTION_PATTERNS[section].some((re) => re.test(heading))) {
        present.add(section);
      }
    }
  }

  // Soft signals from body when headings are sparse
  const body = text.toLowerCase();
  if (!present.has('overview') && body.length > 120) present.add('overview');
  if (!present.has('installation') && /\bnpm install\b|\bpip install\b|\byarn add\b/.test(body)) {
    present.add('installation');
  }
  if (!present.has('usage') && /\b(usage|example|curl |npx )\b/.test(body)) {
    present.add('usage');
  }

  return coveragePercent(present.size, README_SECTIONS.length);
}

async function measureCleanTree(root: string): Promise<number> {
  let score = 100;
  const seenBackupDirs = new Set<string>();
  let tempFiles = 0;
  let copyFiles = 0;

  await walkPaths(root, async (rel, _abs, isDir) => {
    if (isDir) {
      if (BACKUP_DIR_RE.test(rel)) {
        const top = rel.split('/')[0] ?? rel;
        if (!seenBackupDirs.has(top)) {
          seenBackupDirs.add(top);
          score -= 15;
        }
      }
      return;
    }

    const base = path.posix.basename(rel);
    if (TEMP_NAME_RE.test(base) || TEMP_NAME_RE.test(rel)) {
      tempFiles += 1;
    }
    if (/copy of| \(\d+\)\./i.test(base)) {
      copyFiles += 1;
    }
  });

  score -= Math.min(40, tempFiles * 5);
  score -= Math.min(20, copyFiles * 10);
  return Math.max(0, Math.min(100, Math.round(score)));
}

async function measureLockfileLinting(root: string, rootNames: Set<string>): Promise<number> {
  let score = 0;
  const hasNode = rootNames.has('package.json');
  const hasPy = rootNames.has('pyproject.toml') || rootNames.has('requirements.txt');

  if (!hasNode && !hasPy) {
    // No manifest: lockfile N/A contribution — still score lint independently.
    // Carrier formula expects 50+50; treat lockfile half as present when no deps ecosystem.
    score += 50;
  } else {
    const hasLock =
      rootNames.has('pnpm-lock.yaml') ||
      rootNames.has('package-lock.json') ||
      rootNames.has('yarn.lock') ||
      rootNames.has('npm-shrinkwrap.json') ||
      rootNames.has('poetry.lock') ||
      rootNames.has('uv.lock') ||
      rootNames.has('pdm.lock') ||
      (rootNames.has('pyproject.toml') && rootNames.has('requirements.txt'));
    if (hasLock) score += 50;
  }

  if (await anyLinterConfig(root, rootNames)) score += 50;
  return score;
}

async function anyLinterConfig(root: string, rootNames: Set<string>): Promise<boolean> {
  for (const cfg of LINTER_CONFIGS) {
    if (!rootNames.has(cfg)) continue;
    if (cfg !== 'pyproject.toml' && cfg !== 'setup.cfg') return true;
    try {
      const text = await fs.readFile(path.join(root, cfg), 'utf8');
      if (/\[tool\.(ruff|black|flake8|isort)\]/i.test(text)) return true;
      if (/\[flake8\]/i.test(text)) return true;
    } catch {
      // ignore
    }
  }
  return false;
}

async function measureLicenseCompliance(root: string, rootNames: Set<string>): Promise<number> {
  const licenseName = LICENSE_NAMES.find((n) => rootNames.has(n));
  if (!licenseName) return 0;

  const text = await readTextCapped(path.join(root, licenseName), 64 * 1024);
  if (!text) return 40;

  if (DENIED_LICENSE_RE.test(text)) return 25;
  if (APPROVED_LICENSE_RE.test(text)) return 100;

  // LICENSE present but unrecognized — partial credit
  return 60;
}

interface DepKpiScores {
  unusedScore: number | null;
  approvedScore: number | null;
  outdatedScore: number | null;
}

async function measureDependencyKpis(root: string, rootNames: Set<string>): Promise<DepKpiScores> {
  const declared = await readDeclaredDependencies(root, rootNames);
  if (declared.packages.length === 0) {
    return { unusedScore: null, approvedScore: null, outdatedScore: null };
  }

  const imported = await collectImportedPackages(root);
  const unused = declared.packages.filter((pkg) => {
    if (imported.has(pkg)) return false;
    if (pkg.startsWith('@types/')) return !imported.has(pkg.slice('@types/'.length));
    const pyName = pkg.replace(/-/g, '_');
    return !imported.has(pyName);
  });
  const unusedPct =
    declared.packages.length === 0 ? 0 : (unused.length / declared.packages.length) * 100;
  const unusedScore = scoreUnusedDependencyPercent(unusedPct);

  const catalog = approvedCatalog();
  const denied = deniedPackages();
  let approvedScore: number;
  if (catalog) {
    const approved = declared.packages.filter((pkg) => catalog.has(pkg)).length;
    approvedScore = scoreApprovedRatio(approved / declared.packages.length);
  } else {
    const risky = declared.packages.filter((pkg) => denied.has(pkg)).length;
    approvedScore = scoreApprovedRatio(
      (declared.packages.length - risky) / declared.packages.length
    );
  }

  // Prefer registry outdated check; fall back to unpinned ratio.
  const outdatedFromRegistry = await measureOutdatedViaRegistry(declared);
  let outdatedScore: number;
  if (outdatedFromRegistry != null) {
    outdatedScore = outdatedFromRegistry;
  } else {
    const unpinnedRatio =
      declared.packages.length === 0 ? 0 : declared.unpinned.length / declared.packages.length;
    outdatedScore = scoreOutdatedRatio(unpinnedRatio);
  }

  return { unusedScore, approvedScore, outdatedScore };
}

interface DeclaredDependencies {
  ecosystem: 'npm' | 'pypi' | 'none';
  packages: string[];
  versions: Record<string, string>;
  unpinned: string[];
}

async function readDeclaredDependencies(
  root: string,
  rootNames: Set<string>
): Promise<DeclaredDependencies> {
  if (rootNames.has('package.json')) {
    try {
      const raw = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8')) as {
        dependencies?: Record<string, string>;
      };
      const deps = raw.dependencies ?? {};
      const packages = Object.keys(deps);
      const unpinned = packages.filter((name) => isUnpinnedVersion(deps[name] ?? ''));
      return { ecosystem: 'npm', packages, versions: deps, unpinned };
    } catch {
      return { ecosystem: 'npm', packages: [], versions: {}, unpinned: [] };
    }
  }

  if (rootNames.has('requirements.txt')) {
    const packages: string[] = [];
    const versions: Record<string, string> = {};
    const unpinned: string[] = [];
    try {
      const text = await fs.readFile(path.join(root, 'requirements.txt'), 'utf8');
      for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) continue;
        const name = trimmed
          .split(/[[=<>~!]/)[0]!
          .trim()
          .toLowerCase();
        if (!name) continue;
        packages.push(name);
        versions[name] = trimmed;
        if (!/==|~=/.test(trimmed)) unpinned.push(name);
      }
    } catch {
      // ignore
    }
    return { ecosystem: 'pypi', packages, versions, unpinned };
  }

  return { ecosystem: 'none', packages: [], versions: {}, unpinned: [] };
}

function isUnpinnedVersion(spec: string): boolean {
  const value = spec.trim();
  // Wildcards / floating ranges only — caret/tilde are normal npm pins for outdated fallback.
  return (
    value === '*' || value === 'latest' || value === 'x' || value === '' || /^>=?\s*0/.test(value)
  );
}

async function collectImportedPackages(root: string): Promise<Set<string>> {
  const imported = new Set<string>();
  const importRe =
    /(?:from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+([A-Za-z_][\w.]*)\b)/g;

  await walkPaths(root, async (rel, abs, isDir) => {
    if (isDir) return;
    const ext = path.extname(rel).toLowerCase();
    if (!SOURCE_EXTS.has(ext)) return;
    const source = await readTextCapped(abs, 256 * 1024);
    if (!source) return;
    const py = ext === '.py';
    for (const match of source.matchAll(importRe)) {
      const spec = match[1] ?? match[2] ?? match[3] ?? match[4];
      if (!spec || spec.startsWith('.') || spec.startsWith('/')) continue;
      if (py) {
        imported.add(spec.split('.')[0]!.toLowerCase());
        continue;
      }
      if (spec.startsWith('@')) {
        imported.add(spec.split('/').slice(0, 2).join('/'));
        continue;
      }
      imported.add(spec.split('/')[0]!);
    }
  });

  return imported;
}

async function measureOutdatedViaRegistry(declared: DeclaredDependencies): Promise<number | null> {
  if (declared.ecosystem !== 'npm' || declared.packages.length === 0) return null;
  // Skip registry in unit tests / explicit offline mode — fall back to unpinned ratio.
  if (process.env.VITEST || process.env.ARCHLENS_SKIP_REGISTRY === '1') return null;
  // Cap network work for large manifests
  const sample = declared.packages.slice(0, 30);
  let checked = 0;
  let outdated = 0;

  await Promise.all(
    sample.map(async (name) => {
      const current = normalizeSemver(declared.versions[name] ?? '');
      if (!current) return;
      const latest = await fetchNpmLatest(name);
      if (!latest) return;
      checked += 1;
      if (compareSemver(latest, current) > 0) outdated += 1;
    })
  );

  if (checked === 0) return null;
  return scoreOutdatedRatio(outdated / checked);
}

function normalizeSemver(spec: string): string | null {
  const match = spec.trim().match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return `${match[1]}.${match[2]}.${match[3]}`;
}

function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

async function fetchNpmLatest(name: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { version?: string };
    return json.version ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function measureDeadCode(root: string, input: EnterpriseKpiInput): Promise<number> {
  // Prefer IR file-edge analysis when available
  if (input.modules && input.modules.length > 0) {
    const files = new Set<string>();
    for (const mod of input.modules) {
      if (mod.virtual) continue;
      for (const file of mod.files) {
        if (file.path && file.path !== '.') files.add(normalizeRel(file.path));
      }
    }
    if (files.size > 0) {
      const inbound = new Set<string>();
      for (const edge of input.fileEdges ?? []) {
        if (edge.kind === 'import' || edge.kind === 'reference' || edge.kind === 'call') {
          inbound.add(normalizeRel(edge.to));
        }
      }
      // Module-level edges as fallback when fileEdges missing
      if (inbound.size === 0) {
        for (const edge of input.fileEdges ?? []) {
          inbound.add(normalizeRel(edge.to));
        }
      }

      let unused = 0;
      for (const file of files) {
        if (ENTRYPOINT_RE.test(file)) continue;
        if (
          !inbound.has(file) &&
          ![...inbound].some((t) => t.endsWith('/' + file) || file.endsWith('/' + t))
        ) {
          // Also check basename match for edge ids that are module ids
          const base = path.posix.basename(file);
          const hit = [...inbound].some(
            (t) => t === file || t.endsWith('/' + base) || t.includes(file)
          );
          if (!hit) unused += 1;
        }
      }

      const commentedBoost =
        files.size > 0 ? ((input.commentedOutCodeFiles ?? 0) / files.size) * 100 * 0.35 : 0;
      const unusedPct = (unused / files.size) * 100;
      return scoreDeadCodePercent(Math.min(100, unusedPct + commentedBoost));
    }
  }

  // Fallback: filesystem import graph among source files
  const sourceFiles: string[] = [];
  const importsByFile = new Map<string, Set<string>>();

  await walkPaths(root, async (rel, abs, isDir) => {
    if (isDir) return;
    const ext = path.extname(rel).toLowerCase();
    if (!SOURCE_EXTS.has(ext)) return;
    sourceFiles.push(rel);
    const source = await readTextCapped(abs, 256 * 1024);
    if (!source) return;
    const localImports = new Set<string>();
    for (const match of source.matchAll(
      /(?:from\s+['"](\.[^'"]+)['"]|import\s*\(\s*['"](\.[^'"]+)['"]\s*\)|require\s*\(\s*['"](\.[^'"]+)['"]\s*\))/g
    )) {
      const spec = match[1] ?? match[2] ?? match[3];
      if (spec) localImports.add(spec);
    }
    importsByFile.set(rel, localImports);
  });

  if (sourceFiles.length === 0) {
    return scoreDeadCodePercent(0);
  }

  const referenced = new Set<string>();
  for (const [from, specs] of importsByFile) {
    const dir = path.posix.dirname(from);
    for (const spec of specs) {
      const resolved = resolveRelativeImport(dir, spec, sourceFiles);
      if (resolved) referenced.add(resolved);
    }
  }

  let unused = 0;
  for (const file of sourceFiles) {
    if (ENTRYPOINT_RE.test(file)) continue;
    if (!referenced.has(file)) unused += 1;
  }

  const commentedBoost =
    (input.commentedOutCodeFiles ?? 0) > 0
      ? ((input.commentedOutCodeFiles ?? 0) / sourceFiles.length) * 100 * 0.35
      : 0;
  const unusedPct = (unused / sourceFiles.length) * 100;
  return scoreDeadCodePercent(Math.min(100, unusedPct + commentedBoost));
}

function resolveRelativeImport(
  fromDir: string,
  spec: string,
  sourceFiles: string[]
): string | null {
  const joined = path.posix.normalize(path.posix.join(fromDir === '.' ? '' : fromDir, spec));
  const candidates = [
    joined,
    `${joined}.ts`,
    `${joined}.tsx`,
    `${joined}.js`,
    `${joined}.jsx`,
    `${joined}.mjs`,
    `${joined}.cjs`,
    `${joined}.py`,
    `${joined}/index.ts`,
    `${joined}/index.js`,
    `${joined}/__init__.py`,
  ].map((c) => c.replace(/^\.\//, ''));

  for (const candidate of candidates) {
    if (sourceFiles.includes(candidate)) return candidate;
  }
  return null;
}

function normalizeRel(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\.\//, '');
}

function extractMarkdownHeadings(text: string): string[] {
  const headings: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const atx = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (atx) {
      headings.push(atx[1]!.replace(/[*_`]/g, '').trim());
      continue;
    }
  }
  // Setext-style: Title\n=====
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length - 1; i++) {
    if (/^=+$/.test(lines[i + 1]!.trim()) && lines[i]!.trim().length > 0) {
      headings.push(lines[i]!.trim());
    }
    if (/^-+$/.test(lines[i + 1]!.trim()) && lines[i]!.trim().length > 0) {
      headings.push(lines[i]!.trim());
    }
  }
  return headings;
}

async function readTextCapped(abs: string, maxBytes: number): Promise<string | null> {
  try {
    const stat = await fs.stat(abs);
    if (stat.size === 0 || stat.size > maxBytes) {
      if (stat.size > maxBytes) {
        const handle = await fs.open(abs, 'r');
        try {
          const buf = Buffer.alloc(maxBytes);
          const { bytesRead } = await handle.read(buf, 0, maxBytes, 0);
          return buf.slice(0, bytesRead).toString('utf8');
        } finally {
          await handle.close();
        }
      }
      return null;
    }
    return await fs.readFile(abs, 'utf8');
  } catch {
    return null;
  }
}

async function walkPaths(
  root: string,
  visit: (rel: string, abs: string, isDir: boolean) => Promise<void>,
  maxDepth = 12
): Promise<void> {
  const walk = async (dir: string, depth: number): Promise<void> => {
    if (depth > maxDepth) return;
    let entries: import('node:fs').Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const abs = path.join(dir, entry.name);
      const rel = path.relative(root, abs).split(path.sep).join('/');
      if (entry.isDirectory()) {
        await visit(rel, abs, true);
        await walk(abs, depth + 1);
      } else if (entry.isFile()) {
        await visit(rel, abs, false);
      }
    }
  };
  await walk(root, 0);
}
