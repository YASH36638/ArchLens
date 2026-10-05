import { describe, expect, it } from 'vitest';
import { hygieneRadarFromSmellKinds } from '@/lib/assessment/hygiene-radar';

describe('hygieneRadarFromSmellKinds', () => {
  it('scores 100 when no hygiene smells are present', () => {
    const axes = hygieneRadarFromSmellKinds(['long-method']);
    expect(axes.map((axis) => axis.value)).toEqual([100, 100, 100, 100, 100]);
  });

  it('scores 0 on axes whose smells are present', () => {
    const axes = hygieneRadarFromSmellKinds(['missing-readme', 'missing-ci', 'large-binary-file']);
    expect(axes.find((axis) => axis.axis === 'README')?.value).toBe(0);
    expect(axes.find((axis) => axis.axis === 'CI')?.value).toBe(0);
    expect(axes.find((axis) => axis.axis === 'Linting')?.value).toBe(100);
    expect(axes.find((axis) => axis.axis === 'Lockfile')?.value).toBe(100);
    expect(axes.find((axis) => axis.axis === 'Clean tree')?.value).toBe(0);
  });
});
