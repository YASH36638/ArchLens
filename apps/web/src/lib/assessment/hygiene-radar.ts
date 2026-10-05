export interface HygieneRadarAxis {
  axis: string;
  value: number;
  kind: string;
}

const HYGIENE_AXES: ReadonlyArray<{
  axis: string;
  kinds: readonly string[];
}> = [
  { axis: 'README', kinds: ['missing-readme'] },
  { axis: 'CI', kinds: ['missing-ci'] },
  { axis: 'Linting', kinds: ['missing-linter-config'] },
  { axis: 'Lockfile', kinds: ['missing-lockfile'] },
  { axis: 'Clean tree', kinds: ['build-artifacts-committed', 'large-binary-file'] },
];

/** 100 when the hygiene smell is absent, 0 when present. */
export function hygieneRadarFromSmellKinds(
  kinds: readonly string[] | undefined
): HygieneRadarAxis[] {
  const present = new Set(kinds ?? []);
  return HYGIENE_AXES.map(({ axis, kinds: smellKinds }) => ({
    axis,
    kind: smellKinds.join(','),
    value: smellKinds.some((kind) => present.has(kind)) ? 0 : 100,
  }));
}
