import { promises as fs } from 'node:fs';
import path from 'node:path';
import { smellRule } from '@archlens/shared-types';
import type { Smell } from '../../ir/types.js';

// Catalog rules used by this module — registered at import time so a missing
// catalog entry fails loudly.
const MISSING_README = smellRule('missing-readme');
const MISSING_CI = smellRule('missing-ci');
const MISSING_LINTER = smellRule('missing-linter-config');
const MISSING_LOCKFILE = smellRule('missing-lockfile');
const BUILD_ARTIFACTS = smellRule('build-artifacts-committed');
const LARGE_BINARY = smellRule('large-binary-file');
const MISSING_DOCS = smellRule('missing-docs');
const MISSING_LICENSE = smellRule('missing-license');
const HARDCODED_SECRET = smellRule('hardcoded-secret');
const UNUSED_DEPENDENCY = smellRule('unused-dependency');
const UNAPPROVED_DEPENDENCY = smellRule('unapproved-dependency');
const UNPINNED_DEPENDENCY = smellRule('unpinned-dependency');
const INSECURE_API = smellRule('insecure-api');
const COMMENTED_OUT_CODE = smellRule('commented-out-code');

const README_NAMES = ['README.md', 'README.rst', 'README.txt', 'README'];

const LICENSE_NAMES = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'COPYING', 'COPYING.md'];

const DOC_FILES = ['CONTRIBUTING.md', 'CONTRIBUTING', 'docs.md', 'DOCUMENTATION.md'];

const SECRET_FILE_EXTS = new Set([
  '.env',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.java',
  '.kt',
  '.properties',
  '.yml',
  '.yaml',
  '.json',
  '.xml',
  '.sh',
  '.ps1',
  '.tf',
]);

const SECRET_PATTERNS: ReadonlyArray<{ id: string; re: RegExp }> = [
  { id: 'aws-access-key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: 'private-key', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { id: 'github-token', re: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/ },
  { id: 'slack-token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  {
    id: 'generic-api-key',
    re: /\b(?:api[_-]?key|secret[_-]?key|access[_-]?token)\s*[=:]\s*['"][^'"]{12,}['"]/i,
  },
];

const SECRET_PLACEHOLDERS = /change.?me|your[_-]?key|example|placeholder|xxx+|todo/i;

const MAX_SECRET_FILE_BYTES = 256 * 1024;

const SOURCE_IMPORT_EXTS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.java',
  '.kt',
]);

const API_SECURITY_PATTERNS: ReadonlyArray<{ id: string; re: RegExp }> = [
  { id: 'eval', re: /\beval\s*\(/ },
  { id: 'innerHTML', re: /\.innerHTML\s*=/ },
  { id: 'dangerouslySetInnerHTML', re: /\bdangerouslySetInnerHTML\b/ },
  { id: 'wildcard-cors', re: /origin\s*:\s*['"]\*['"]/ },
  { id: 'tls-disabled', re: /rejectUnauthorized\s*:\s*false/ },
  { id: 'verify-false', re: /verify\s*=\s*False/ },
  { id: 'flask-debug', re: /\.run\s*\([^)]*debug\s*=\s*True/ },
  { id: 'md5-password', re: /\b(?:createHash\(\s*['"]md5['"]\)|hashlib\.md5\()/ },
  { id: 'pickle-loads', re: /\bpickle\.loads?\s*\(/ },
  { id: 'yaml-unsafe-load', re: /\byaml\.load\s*\(/ },
];

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

function deniedPackages(): Set<string> {
  const extra = process.env.ARCHLENS_DENIED_PACKAGES?.split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  if (!extra?.length) return RISK_PACKAGES;
  return new Set([...RISK_PACKAGES, ...extra]);
}

const JS_COMMENTED_CODE_LIKE = [
  /^\s*(const|let|var|function|class|import|export|return|if|else|for|while|switch|try|catch|await|async)\b/,
  /^\s*\w+\s*=\s*[^=]/,
  /^\s*\w+\(.*\)\s*;?\s*$/,
  /^\s*this\.\w+/,
];

const JS_TS_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const COMMENTED_CODE_THRESHOLD = 3;

const IMPORT_RE =
  /(?:from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+([A-Za-z_][\w.]*)\b)/g;

const CI_PATHS = [
  '.github/workflows',
  '.gitlab-ci.yml',
  '.circleci/config.yml',
  '.travis.yml',
  'azure-pipelines.yml',
  'Jenkinsfile',
];

const LINTER_CONFIGS = [
  '.prettierrc',
  '.prettierrc.json',
  '.prettierrc.yml',
  '.prettierrc.yaml',
  '.prettierrc.js',
  '.eslintrc',
  '.eslintrc.json',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.yml',
  'eslint.config.js',
  'eslint.config.mjs',
  '.flake8',
  'setup.cfg',
  'ruff.toml',
  '.ruff.toml',
  'pyproject.toml', // checked further for [tool.ruff]/[tool.black]/[tool.flake8]
];

const BUILD_DIRS = new Set([
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '__pycache__',
  '.pytest_cache',
  'target', // java
  'bin',
]);

// We don't walk these by default — they're virtualenvs / VCS / vendored deps.
const SKIP_DIRS = new Set(['.git', 'node_modules', '.venv', 'venv', '.tox']);

const BINARY_EXTS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.tiff',
  '.ico',
  '.webp',
  '.mp3',
  '.mp4',
  '.mov',
  '.avi',
  '.wav',
  '.flac',
  '.ogg',
  '.zip',
  '.tar',
  '.gz',
  '.7z',
  '.rar',
  '.bin',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.jar',
  '.war',
  '.psd',
  '.ai',
  '.sketch',
  '.pdf',
]);

export interface RepoHygieneInput {
  repoPath: string;
}

export interface RepoHygieneThresholds {
  largeBinaryBytes: number;
}

let counter = 0;
const nextId = (kind: string): string => `smell_${kind}_${++counter}`;

export async function detectRepoHygiene(
  input: RepoHygieneInput,
  thresholds: RepoHygieneThresholds
): Promise<Smell[]> {
  const root = path.resolve(input.repoPath);
  const out: Smell[] = [];

  const rootEntries = await fs.readdir(root, { withFileTypes: true });
  const rootNames = new Set(rootEntries.map((e) => e.name));

  if (!README_NAMES.some((n) => rootNames.has(n))) {
    out.push({
      id: nextId('missing_readme'),
      kind: MISSING_README.kind,
      ruleId: MISSING_README.ruleId,
      severity: 'info',
      message: 'No README found at the repo root',
      file: 'README.md',
    });
  }

  if (!(await anyCiConfig(root, rootNames))) {
    out.push({
      id: nextId('missing_ci'),
      kind: MISSING_CI.kind,
      ruleId: MISSING_CI.ruleId,
      severity: 'info',
      message:
        'No CI configuration detected (looked for GitHub Actions, GitLab, CircleCI, Travis, Jenkins, Azure)',
      file: '.github/workflows/',
    });
  }

  if (!(await anyLinterConfig(root, rootNames))) {
    out.push({
      id: nextId('missing_linter'),
      kind: MISSING_LINTER.kind,
      ruleId: MISSING_LINTER.ruleId,
      severity: 'info',
      message: 'No linter or formatter configuration found at the repo root',
      file: rootNames.has('pyproject.toml') ? 'pyproject.toml' : 'package.json',
    });
  }

  out.push(...detectMissingLockfiles(rootNames));

  if (!hasDocumentationSet(rootNames)) {
    out.push({
      id: nextId('missing_docs'),
      kind: MISSING_DOCS.kind,
      ruleId: MISSING_DOCS.ruleId,
      severity: 'info',
      message: 'No docs/ folder or CONTRIBUTING guide found — thin contractor handoff set',
      file: 'docs/',
    });
  }

  if (!LICENSE_NAMES.some((n) => rootNames.has(n))) {
    out.push({
      id: nextId('missing_license'),
      kind: MISSING_LICENSE.kind,
      ruleId: MISSING_LICENSE.ruleId,
      severity: 'minor',
      message: 'No LICENSE file found at the repo root',
      file: 'LICENSE',
    });
  }

  const walkResults = await walkForArtifactsAndBinaries(root, thresholds.largeBinaryBytes);
  for (const dir of walkResults.buildDirs) {
    out.push({
      id: nextId('build_artifacts'),
      kind: BUILD_ARTIFACTS.kind,
      ruleId: BUILD_ARTIFACTS.ruleId,
      severity: 'minor',
      message: `Build artifact directory committed: ${dir}`,
      file: dir,
    });
  }
  for (const bin of walkResults.largeBinaries) {
    out.push({
      id: nextId('large_binary'),
      kind: LARGE_BINARY.kind,
      ruleId: LARGE_BINARY.ruleId,
      severity: bin.size >= thresholds.largeBinaryBytes * 5 ? 'major' : 'minor',
      message: `Large binary file (${formatBytes(bin.size)}) committed: ${bin.relPath}`,
      file: bin.relPath,
    });
  }
  for (const secret of walkResults.secrets) {
    out.push({
      id: nextId('hardcoded_secret'),
      kind: HARDCODED_SECRET.kind,
      ruleId: HARDCODED_SECRET.ruleId,
      severity: 'critical',
      message: `Likely hardcoded ${secret.patternId} in ${secret.relPath} (value not shown)`,
      file: secret.relPath,
    });
  }
  for (const api of walkResults.insecureApis) {
    out.push({
      id: nextId('insecure_api'),
      kind: INSECURE_API.kind,
      ruleId: INSECURE_API.ruleId,
      severity: 'major',
      message: `Insecure API usage (${api.patternId}) in ${api.relPath}`,
      file: api.relPath,
    });
  }
  for (const dead of walkResults.commentedOutCode) {
    out.push({
      id: nextId('commented_out_code'),
      kind: COMMENTED_OUT_CODE.kind,
      ruleId: COMMENTED_OUT_CODE.ruleId,
      severity: dead.suspicious >= COMMENTED_CODE_THRESHOLD * 3 ? 'minor' : 'info',
      message: `${dead.relPath} contains ${dead.suspicious} comment lines that look like commented-out code (>= ${COMMENTED_CODE_THRESHOLD})`,
      file: dead.relPath,
      location:
        dead.firstLine > 0 ? { startLine: dead.firstLine, endLine: dead.firstLine } : undefined,
    });
  }

  out.push(...(await detectDependencyPolicy(root, rootNames, walkResults.importedPackages)));

  return out;
}

function hasDocumentationSet(rootNames: Set<string>): boolean {
  if (rootNames.has('docs') || rootNames.has('documentation')) return true;
  return DOC_FILES.some((name) => rootNames.has(name));
}

async function anyCiConfig(root: string, rootNames: Set<string>): Promise<boolean> {
  for (const candidate of CI_PATHS) {
    const abs = path.join(root, candidate);
    try {
      const stat = await fs.stat(abs);
      if (stat.isDirectory()) {
        const entries = await fs.readdir(abs);
        if (entries.length > 0) return true;
      } else if (stat.isFile()) {
        return true;
      }
    } catch {
      // not present — keep looking
    }
  }
  // tolerate a top-level ".github" with anything in it (e.g. issue templates
  // alone don't run CI, so we still only count workflows above)
  void rootNames;
  return false;
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
      // ignore unreadable
    }
  }
  return false;
}

function detectMissingLockfiles(rootNames: Set<string>): Smell[] {
  const out: Smell[] = [];

  if (rootNames.has('package.json')) {
    const hasLock =
      rootNames.has('pnpm-lock.yaml') ||
      rootNames.has('package-lock.json') ||
      rootNames.has('yarn.lock') ||
      rootNames.has('npm-shrinkwrap.json');
    if (!hasLock) {
      out.push({
        id: nextId('missing_lockfile_node'),
        kind: MISSING_LOCKFILE.kind,
        ruleId: MISSING_LOCKFILE.ruleId,
        severity: 'minor',
        message:
          'package.json found but no lockfile (pnpm-lock.yaml / package-lock.json / yarn.lock)',
        file: 'package.json',
      });
    }
  }

  if (rootNames.has('pyproject.toml')) {
    const hasLock =
      rootNames.has('poetry.lock') ||
      rootNames.has('uv.lock') ||
      rootNames.has('pdm.lock') ||
      rootNames.has('requirements.txt');
    if (!hasLock) {
      out.push({
        id: nextId('missing_lockfile_py'),
        kind: MISSING_LOCKFILE.kind,
        ruleId: MISSING_LOCKFILE.ruleId,
        severity: 'minor',
        message:
          'pyproject.toml found but no lockfile (poetry.lock / uv.lock / pdm.lock / requirements.txt)',
        file: 'pyproject.toml',
      });
    }
  }

  return out;
}

interface WalkResult {
  buildDirs: string[];
  largeBinaries: Array<{ relPath: string; size: number }>;
  secrets: Array<{ relPath: string; patternId: string }>;
  insecureApis: Array<{ relPath: string; patternId: string }>;
  commentedOutCode: Array<{ relPath: string; suspicious: number; firstLine: number }>;
  importedPackages: Set<string>;
}

async function walkForArtifactsAndBinaries(
  root: string,
  largeBinaryBytes: number
): Promise<WalkResult> {
  const buildDirs = new Set<string>();
  const largeBinaries: Array<{ relPath: string; size: number }> = [];
  const secrets: Array<{ relPath: string; patternId: string }> = [];
  const insecureApis: Array<{ relPath: string; patternId: string }> = [];
  const commentedOutCode: Array<{ relPath: string; suspicious: number; firstLine: number }> = [];
  const importedPackages = new Set<string>();

  const walk = async (dir: string): Promise<void> => {
    let entries: import('node:fs').Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      const rel = path.relative(root, abs).split(path.sep).join('/');

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        if (BUILD_DIRS.has(entry.name)) {
          buildDirs.add(rel);
          continue; // don't recurse into a build dir
        }
        await walk(abs);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (BINARY_EXTS.has(ext)) {
          try {
            const stat = await fs.stat(abs);
            if (stat.size >= largeBinaryBytes) {
              largeBinaries.push({ relPath: rel, size: stat.size });
            }
          } catch {
            // ignore
          }
          continue;
        }
        if (SECRET_FILE_EXTS.has(ext) || entry.name.startsWith('.env')) {
          const hit = await scanFileForSecrets(abs);
          if (hit) secrets.push({ relPath: rel, patternId: hit });
        }
        if (SOURCE_IMPORT_EXTS.has(ext)) {
          const source = await readTextCapped(abs);
          if (source) {
            const apiHit = scanFileForInsecureApi(source);
            if (apiHit) insecureApis.push({ relPath: rel, patternId: apiHit });
            for (const pkg of extractImportedPackages(source, ext)) {
              importedPackages.add(pkg);
            }
            if (JS_TS_EXTS.has(ext)) {
              const dead = scanJsCommentedOutCode(source);
              if (dead.suspicious >= COMMENTED_CODE_THRESHOLD) {
                commentedOutCode.push({ relPath: rel, ...dead });
              }
            }
          }
        }
      }
    }
  };

  await walk(root);
  return {
    buildDirs: Array.from(buildDirs).sort(),
    largeBinaries,
    secrets,
    insecureApis,
    commentedOutCode,
    importedPackages,
  };
}

async function scanFileForSecrets(abs: string): Promise<string | null> {
  const text = await readTextCapped(abs);
  if (!text) return null;
  for (const { id, re } of SECRET_PATTERNS) {
    const match = text.match(re);
    if (!match) continue;
    if (SECRET_PLACEHOLDERS.test(match[0] ?? '')) continue;
    return id;
  }
  return null;
}

function scanFileForInsecureApi(text: string): string | null {
  for (const { id, re } of API_SECURITY_PATTERNS) {
    if (re.test(text)) return id;
  }
  return null;
}

function scanJsCommentedOutCode(source: string): { suspicious: number; firstLine: number } {
  let suspicious = 0;
  let firstLine = 0;
  const lines = source.split(/\r?\n/);
  let inBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const trimmed = raw.trim();

    if (inBlock) {
      const end = trimmed.indexOf('*/');
      const body = end >= 0 ? trimmed.slice(0, end) : trimmed;
      if (body.length > 0 && JS_COMMENTED_CODE_LIKE.some((re) => re.test(body))) {
        suspicious += 1;
        if (firstLine === 0) firstLine = i + 1;
      }
      if (end >= 0) inBlock = false;
      continue;
    }

    if (trimmed.startsWith('/*')) {
      inBlock = !trimmed.includes('*/');
      const body = trimmed.replace(/^\/\*+\s?/, '').replace(/\*+\/$/, '');
      if (body.length > 0 && JS_COMMENTED_CODE_LIKE.some((re) => re.test(body))) {
        suspicious += 1;
        if (firstLine === 0) firstLine = i + 1;
      }
      continue;
    }

    if (!trimmed.startsWith('//')) continue;
    const body = trimmed.replace(/^\/\/+\s?/, '');
    if (body.length === 0) continue;
    if (JS_COMMENTED_CODE_LIKE.some((re) => re.test(body))) {
      suspicious += 1;
      if (firstLine === 0) firstLine = i + 1;
    }
  }

  return { suspicious, firstLine };
}

async function readTextCapped(abs: string): Promise<string | null> {
  try {
    const stat = await fs.stat(abs);
    if (stat.size === 0 || stat.size > MAX_SECRET_FILE_BYTES) return null;
    return await fs.readFile(abs, 'utf8');
  } catch {
    return null;
  }
}

function extractImportedPackages(source: string, ext: string): string[] {
  const found: string[] = [];
  const py = ext === '.py';
  for (const match of source.matchAll(IMPORT_RE)) {
    const spec = match[1] ?? match[2] ?? match[3] ?? match[4];
    if (!spec || spec.startsWith('.') || spec.startsWith('/')) continue;
    if (py) {
      found.push(spec.split('.')[0]!.toLowerCase());
      continue;
    }
    if (spec.startsWith('@')) {
      const parts = spec.split('/');
      found.push(parts.slice(0, 2).join('/'));
      continue;
    }
    found.push(spec.split('/')[0]!);
  }
  return found;
}

async function detectDependencyPolicy(
  root: string,
  rootNames: Set<string>,
  importedPackages: Set<string>
): Promise<Smell[]> {
  const out: Smell[] = [];
  const declared = await readDeclaredDependencies(root, rootNames);

  const unused =
    importedPackages.size === 0
      ? []
      : declared.packages.filter((pkg) => {
          if (importedPackages.has(pkg)) return false;
          if (pkg.startsWith('@types/')) {
            return !importedPackages.has(pkg.slice('@types/'.length));
          }
          const pyName = pkg.replace(/-/g, '_');
          return !importedPackages.has(pyName);
        });
  if (unused.length > 0) {
    const shown = unused.slice(0, 8);
    out.push({
      id: nextId('unused_dependency'),
      kind: UNUSED_DEPENDENCY.kind,
      ruleId: UNUSED_DEPENDENCY.ruleId,
      severity: 'minor',
      message: `Unused production ${shown.length === 1 ? 'dependency' : 'dependencies'}: ${shown.join(', ')}${unused.length > shown.length ? ` (+${unused.length - shown.length} more)` : ''}`,
      file: declared.manifest,
    });
  }

  const risky = declared.packages.filter((pkg) => deniedPackages().has(pkg));
  if (risky.length > 0) {
    out.push({
      id: nextId('unapproved_dependency'),
      kind: UNAPPROVED_DEPENDENCY.kind,
      ruleId: UNAPPROVED_DEPENDENCY.ruleId,
      severity: 'major',
      message: `High-risk or unapproved ${risky.length === 1 ? 'package' : 'packages'}: ${risky.join(', ')}`,
      file: declared.manifest,
    });
  }

  if (declared.unpinned.length > 0) {
    const shown = declared.unpinned.slice(0, 8);
    out.push({
      id: nextId('unpinned_dependency'),
      kind: UNPINNED_DEPENDENCY.kind,
      ruleId: UNPINNED_DEPENDENCY.ruleId,
      severity: 'minor',
      message: `Unpinned production ${shown.length === 1 ? 'dependency' : 'dependencies'}: ${shown.join(', ')}`,
      file: declared.manifest,
    });
  }

  return out;
}

interface DeclaredDependencies {
  manifest: string;
  packages: string[];
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
      return { manifest: 'package.json', packages, unpinned };
    } catch {
      return { manifest: 'package.json', packages: [], unpinned: [] };
    }
  }

  if (rootNames.has('requirements.txt')) {
    const packages: string[] = [];
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
        if (!/==|~=/.test(trimmed)) unpinned.push(name);
      }
    } catch {
      // ignore
    }
    return { manifest: 'requirements.txt', packages, unpinned };
  }

  return { manifest: 'package.json', packages: [], unpinned: [] };
}

function isUnpinnedVersion(spec: string): boolean {
  const value = spec.trim();
  return (
    value === '*' || value === 'latest' || value === 'x' || value === '' || /^>=?\s*0/.test(value)
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
