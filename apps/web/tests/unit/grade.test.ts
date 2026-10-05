import { describe, it, expect } from 'vitest';
import {
  scoreToGrade,
  scoreToCarrierGradeLabel,
  gradeColor,
  gradeLabel,
  scoreToTone,
  scoreSurface,
  scoreNeedsAttention,
} from '@/lib/utils/grade';

describe('scoreToGrade (Carrier bands → A–E)', () => {
  it.each([
    [100, 'A'],
    [95, 'A'],
    [90, 'A'],
    [89.99, 'B'],
    [85, 'B'],
    [80, 'B'],
    [79.99, 'C'],
    [70, 'C'],
    [69.99, 'D'],
    [60, 'D'],
    [59.99, 'E'],
    [10, 'E'],
    [0, 'E'],
  ])('maps %s to %s', (score, expected) => {
    expect(scoreToGrade(score)).toBe(expected);
  });

  it('clamps values above 100 to A', () => {
    expect(scoreToGrade(150)).toBe('A');
  });

  it('clamps negative values to E', () => {
    expect(scoreToGrade(-20)).toBe('E');
  });
});

describe('scoreToCarrierGradeLabel', () => {
  it.each([
    [100, 'A+'],
    [95, 'A+'],
    [94, 'A'],
    [90, 'A'],
    [89, 'B+'],
    [85, 'B+'],
    [84, 'B'],
    [80, 'B'],
    [79, 'C'],
    [70, 'C'],
    [69, 'D'],
    [60, 'D'],
    [59, 'F'],
  ])('maps %s to %s', (score, expected) => {
    expect(scoreToCarrierGradeLabel(score)).toBe(expected);
  });
});

describe('gradeColor', () => {
  it('returns a color triple for every grade', () => {
    for (const g of ['A', 'B', 'C', 'D', 'E'] as const) {
      const c = gradeColor(g);
      expect(c.bg).toMatch(/^bg-grade-/);
      expect(c.text).toMatch(/^text-grade-/);
      expect(c.ring).toMatch(/^ring-grade-/);
    }
  });

  it('A and E use distinct colors', () => {
    expect(gradeColor('A')).not.toEqual(gradeColor('E'));
  });
});

describe('gradeLabel', () => {
  it('returns a non-empty label for every grade', () => {
    for (const g of ['A', 'B', 'C', 'D', 'E'] as const) {
      expect(gradeLabel(g).length).toBeGreaterThan(0);
    }
  });
});

describe('scoreToTone / scoreSurface', () => {
  it('maps score bands to color tones', () => {
    expect(scoreToTone(95)).toBe('excellent');
    expect(scoreToTone(80)).toBe('good');
    expect(scoreToTone(72)).toBe('fair');
    expect(scoreToTone(65)).toBe('poor');
    expect(scoreToTone(10)).toBe('critical');
    expect(scoreToTone(null)).toBe('neutral');
  });

  it('returns calm neutral card surfaces for every tone', () => {
    for (const score of [95, 80, 65, 45, 10, null] as const) {
      const surface = scoreSurface(score);
      expect(surface.card).toContain('bg-card');
      expect(surface.text).toMatch(/^text-/);
      expect(surface.accent).toMatch(/^bg-/);
    }
  });
});

describe('scoreNeedsAttention', () => {
  it('flags scores below Fair (70) as needing attention', () => {
    expect(scoreNeedsAttention(70)).toBe(false);
    expect(scoreNeedsAttention(69.99)).toBe(true);
    expect(scoreNeedsAttention(80)).toBe(false);
    expect(scoreNeedsAttention(40)).toBe(true);
  });
});
