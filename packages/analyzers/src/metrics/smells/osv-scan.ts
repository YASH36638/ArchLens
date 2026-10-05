import { promises as fs } from 'node:fs';
import path from 'node:path';
import { smellRule } from '@archlens/shared-types';
import type { Smell } from '../../ir/types.js';

const VULNERABLE_DEPENDENCY = smellRule('vulnerable-dependency');

const OSV_BATCH_URL = 'https://api.osv.dev/v1/querybatch';
const BATCH_SIZE = 100;
const MAX_PACKAGES = 500;
const TIMEOUT_MS = 8_000;
const MAX_FINDINGS = 20;

interface ResolvedPackage {
  name: string;
  version: string;
  ecosystem: 'npm' | 'PyPI';
}

export interface OsvScanResult {
  smells: Smell[];
  vulnerableScore: number | null;
  hasCriticalVulnerability: boolean;
}

let counter = 0;
const nextId = (): string => `smell_vulnerable_dep_${++counter}`;

export async function scanOsvVulnerabilities(repoPath: string): Promise<OsvScanResult> {
  const root = path.resolve(repoPath);
  const packages = await collectResolvedPackages(root);
  if (packages.length === 0) {
    return { smells: [], vulnerableScore: null, hasCriticalVulnerability: false };
  }

  try {
    const capped = packages.slice(0, MAX_PACKAGES);
    const vulns = await queryOsvBatch(capped);
    const smells = buildSmells(vulns);
    const vulnerableScore = scoreFromVulns(vulns);
    const hasCriticalVulnerability = vulns.some((v) => v.bucket === 'critical');
    return { smells, vulnerableScore, hasCriticalVulnerability };
  } catch {
    return { smells: [], vulnerableScore: null, hasCriticalVulnerability: false };
  }
}

async function collectResolvedPackages(root: string): Promise<ResolvedPackage[]> {
  const byKey = new Map<string, ResolvedPackage>();
  const add = (pkg: ResolvedPackage): void => {
    const key = `${pkg.ecosystem}:${pkg.name}@${pkg.version}`;
    if (!byKey.has(key)) byKey.set(key, pkg);
  };

  await parsePackageLock(root, add);
  await parsePnpmLock(root, add);
  await parseYarnLock(root, add);
  await parsePoetryLock(root, add);
  await parseRequirementsTxt(root, add);

  return [...byKey.values()];
}

async function parsePackageLock(root: string, add: (pkg: ResolvedPackage) => void): Promise<void> {
  const abs = path.join(root, 'package-lock.json');
  let raw: string;
  try {
    raw = await fs.readFile(abs, 'utf8');
  } catch {
    return;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }
  if (!parsed || typeof parsed !== 'object') return;
  const obj = parsed as Record<string, unknown>;

  if (obj.packages && typeof obj.packages === 'object') {
    for (const [key, entry] of Object.entries(obj.packages as Record<string, unknown>)) {
      if (key === '' || !entry || typeof entry !== 'object') continue;
      const version = (entry as { version?: string }).version;
      if (!version) continue;
      const name = key.replace(/^node_modules\//, '');
      if (!name || name.startsWith('node_modules/')) continue;
      add({ name, version, ecosystem: 'npm' });
    }
    return;
  }

  const walkDeps = (deps: unknown): void => {
    if (!deps || typeof deps !== 'object') return;
    for (const [name, meta] of Object.entries(deps as Record<string, unknown>)) {
      if (!meta || typeof meta !== 'object') continue;
      const version = (meta as { version?: string }).version;
      if (version) add({ name, version, ecosystem: 'npm' });
      walkDeps((meta as { dependencies?: unknown }).dependencies);
    }
  };
  walkDeps(obj.dependencies);
}

async function parsePnpmLock(root: string, add: (pkg: ResolvedPackage) => void): Promise<void> {
  const abs = path.join(root, 'pnpm-lock.yaml');
  let raw: string;
  try {
    raw = await fs.readFile(abs, 'utf8');
  } catch {
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s{2}\/([^@/]+)@([^:]+):/);
    if (!match) continue;
    add({ name: match[1]!, version: match[2]!, ecosystem: 'npm' });
  }
}

async function parseYarnLock(root: string, add: (pkg: ResolvedPackage) => void): Promise<void> {
  const abs = path.join(root, 'yarn.lock');
  let raw: string;
  try {
    raw = await fs.readFile(abs, 'utf8');
  } catch {
    return;
  }
  let currentName: string | null = null;
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith(' ') && line.includes('@')) {
      currentName = line.split(',')[0]!.replace(/"/g, '').split('@')[0] ?? null;
      continue;
    }
    const versionMatch = line.match(/^\s+version\s+"([^"]+)"/);
    if (versionMatch && currentName) {
      add({ name: currentName, version: versionMatch[1]!, ecosystem: 'npm' });
    }
  }
}

async function parsePoetryLock(root: string, add: (pkg: ResolvedPackage) => void): Promise<void> {
  const abs = path.join(root, 'poetry.lock');
  let raw: string;
  try {
    raw = await fs.readFile(abs, 'utf8');
  } catch {
    return;
  }
  let name: string | null = null;
  for (const line of raw.split(/\r?\n/)) {
    const nameMatch = line.match(/^name = "([^"]+)"/);
    if (nameMatch) {
      name = nameMatch[1]!;
      continue;
    }
    const versionMatch = line.match(/^version = "([^"]+)"/);
    if (versionMatch && name) {
      add({ name, version: versionMatch[1]!, ecosystem: 'PyPI' });
      name = null;
    }
  }
}

async function parseRequirementsTxt(
  root: string,
  add: (pkg: ResolvedPackage) => void
): Promise<void> {
  const abs = path.join(root, 'requirements.txt');
  let raw: string;
  try {
    raw = await fs.readFile(abs, 'utf8');
  } catch {
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('-')) continue;
    const match = trimmed.match(/^([A-Za-z0-9][A-Za-z0-9._-]*)\s*==\s*([^\s#;]+)/);
    if (match) {
      add({ name: match[1]!, version: match[2]!, ecosystem: 'PyPI' });
    }
  }
}

interface PackageVuln {
  package: ResolvedPackage;
  vulnId: string;
  bucket: 'critical' | 'high' | 'medium';
}

async function queryOsvBatch(packages: ResolvedPackage[]): Promise<PackageVuln[]> {
  const found: PackageVuln[] = [];
  for (let i = 0; i < packages.length; i += BATCH_SIZE) {
    const chunk = packages.slice(i, i + BATCH_SIZE);
    const body = {
      queries: chunk.map((pkg) => ({
        package: { name: pkg.name, ecosystem: pkg.ecosystem },
        version: pkg.version,
      })),
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(OSV_BATCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) throw new Error(`OSV batch failed: ${response.status}`);
    const payload = (await response.json()) as { results?: Array<{ vulns?: unknown[] }> };
    const results = payload.results ?? [];
    for (let j = 0; j < chunk.length; j++) {
      const pkg = chunk[j]!;
      const vulns = results[j]?.vulns ?? [];
      for (const vuln of vulns) {
        if (!vuln || typeof vuln !== 'object') continue;
        const record = vuln as { id?: string; severity?: Array<{ type?: string; score?: string }> };
        const vulnId = record.id ?? 'UNKNOWN';
        found.push({ package: pkg, vulnId, bucket: severityBucket(record) });
      }
    }
  }
  return found;
}

function severityBucket(vuln: {
  id?: string;
  severity?: Array<{ type?: string; score?: string }>;
}): 'critical' | 'high' | 'medium' {
  let maxCvss = 0;
  for (const entry of vuln.severity ?? []) {
    const score = Number.parseFloat(entry.score ?? '');
    if (Number.isFinite(score)) maxCvss = Math.max(maxCvss, score);
  }
  if (maxCvss >= 9) return 'critical';
  if (maxCvss >= 7) return 'high';
  if (maxCvss >= 4) return 'medium';
  // Unknown severity still counts as medium so we do not silently green-wash.
  return 'medium';
}

function scoreFromVulns(vulns: PackageVuln[]): number {
  let critical = 0;
  let high = 0;
  let medium = 0;
  for (const vuln of vulns) {
    if (vuln.bucket === 'critical') critical += 1;
    else if (vuln.bucket === 'high') high += 1;
    else medium += 1;
  }
  const penalty = Math.min(100, critical * 25 + high * 10 + medium * 3);
  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}

function buildSmells(vulns: PackageVuln[]): Smell[] {
  const seen = new Set<string>();
  const smells: Smell[] = [];
  for (const vuln of vulns) {
    const key = `${vuln.package.name}@${vuln.package.version}:${vuln.vulnId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (smells.length >= MAX_FINDINGS) break;
    smells.push({
      id: nextId(),
      kind: VULNERABLE_DEPENDENCY.kind,
      ruleId: VULNERABLE_DEPENDENCY.ruleId,
      severity:
        vuln.bucket === 'critical' ? 'critical' : vuln.bucket === 'high' ? 'major' : 'minor',
      message: `${vuln.package.name}@${vuln.package.version} — ${vuln.vulnId}`,
      file: vuln.package.ecosystem === 'npm' ? 'package-lock.json' : 'requirements.txt',
    });
  }
  return smells;
}
