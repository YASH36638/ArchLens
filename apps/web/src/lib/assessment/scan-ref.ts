import type { ScanDto } from '@archlens/shared-types';

export function scanRef(scan: Pick<ScanDto, 'ref'>, fallback = 'main'): string {
  const value = scan.ref?.trim();
  return value && value.length > 0 ? value : fallback;
}

export function latestCompletedScanByRef(
  scans: ScanDto[],
  fallback = 'main'
): Map<string, ScanDto> {
  const latest = new Map<string, ScanDto>();
  for (const scan of scans) {
    if (scan.status !== 'completed') continue;
    const ref = scanRef(scan, fallback);
    if (!latest.has(ref)) latest.set(ref, scan);
  }
  return latest;
}
