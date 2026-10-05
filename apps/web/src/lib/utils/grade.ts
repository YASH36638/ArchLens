import type { Grade } from '@archlens/shared-types';

/**
 * Carrier grade bands mapped to IR Grade A–E.
 * Display labels use scoreToCarrierGradeLabel for A+/B+/F.
 */
export const GRADE_THRESHOLDS: ReadonlyArray<{ min: number; grade: Grade }> = [
  { min: 90, grade: 'A' },
  { min: 80, grade: 'B' },
  { min: 70, grade: 'C' },
  { min: 60, grade: 'D' },
  { min: 0, grade: 'E' },
];

export function scoreToGrade(score: number): Grade {
  const clamped = Math.max(0, Math.min(100, score));
  for (const { min, grade } of GRADE_THRESHOLDS) {
    if (clamped >= min) return grade;
  }
  return 'E';
}

export function scoreToCarrierGradeLabel(score: number): string {
  const clamped = Math.max(0, Math.min(100, score));
  if (clamped >= 95) return 'A+';
  if (clamped >= 90) return 'A';
  if (clamped >= 85) return 'B+';
  if (clamped >= 80) return 'B';
  if (clamped >= 70) return 'C';
  if (clamped >= 60) return 'D';
  return 'F';
}

/** Fair (C) starts at 70. Below this a section needs attention. */
export const SECTION_ATTENTION_THRESHOLD = GRADE_THRESHOLDS.find(
  (entry) => entry.grade === 'C'
)!.min;

export function scoreNeedsAttention(score: number): boolean {
  return score < SECTION_ATTENTION_THRESHOLD;
}

const GRADE_COLORS: Record<Grade, { bg: string; text: string; ring: string }> = {
  A: { bg: 'bg-grade-a', text: 'text-grade-a', ring: 'ring-grade-a/20' },
  B: { bg: 'bg-grade-b', text: 'text-grade-b', ring: 'ring-grade-b/20' },
  C: { bg: 'bg-grade-c', text: 'text-grade-c', ring: 'ring-grade-c/20' },
  D: { bg: 'bg-grade-d', text: 'text-grade-d', ring: 'ring-grade-d/20' },
  E: { bg: 'bg-grade-e', text: 'text-grade-e', ring: 'ring-grade-e/20' },
};

export function gradeColor(grade: Grade): { bg: string; text: string; ring: string } {
  return GRADE_COLORS[grade];
}

export function gradeLabel(grade: Grade): string {
  switch (grade) {
    case 'A':
      return 'Excellent';
    case 'B':
      return 'Good';
    case 'C':
      return 'Fair';
    case 'D':
      return 'Poor';
    case 'E':
      return 'Critical';
  }
}

/** Visual band used instead of letter grades (same thresholds as A–E). */
export type ScoreTone = 'excellent' | 'good' | 'fair' | 'poor' | 'critical' | 'neutral';

export function scoreToTone(score: number | null | undefined): ScoreTone {
  if (score == null || Number.isNaN(score)) return 'neutral';
  switch (scoreToGrade(score)) {
    case 'A':
      return 'excellent';
    case 'B':
      return 'good';
    case 'C':
      return 'fair';
    case 'D':
      return 'poor';
    case 'E':
      return 'critical';
  }
}

export interface ScoreSurface {
  tone: ScoreTone;
  /** Soft tinted card / section background + border. */
  card: string;
  /** Accent bar / pill color. */
  accent: string;
  /** Emphasized score number. */
  text: string;
  /** Supporting muted text on the tinted surface. */
  muted: string;
  /** Compact chip / table cell pill. */
  chip: string;
}

const SCORE_SURFACES: Record<ScoreTone, Omit<ScoreSurface, 'tone'>> = {
  excellent: {
    card: 'border-border bg-card shadow-xs',
    accent: 'bg-success',
    text: 'text-success',
    muted: 'text-muted-foreground',
    chip: 'border-success/30 bg-success/10 text-success font-medium',
  },
  good: {
    card: 'border-border bg-card shadow-xs',
    accent: 'bg-success',
    text: 'text-success',
    muted: 'text-muted-foreground',
    chip: 'border-success/30 bg-success/10 text-success font-medium',
  },
  fair: {
    card: 'border-border bg-card shadow-xs',
    accent: 'bg-warning',
    text: 'text-warning',
    muted: 'text-muted-foreground',
    chip: 'border-warning/30 bg-warning/10 text-warning font-medium',
  },
  poor: {
    card: 'border-border bg-card shadow-xs',
    accent: 'bg-risk',
    text: 'text-risk',
    muted: 'text-muted-foreground',
    chip: 'border-risk/30 bg-risk/10 text-risk font-medium',
  },
  critical: {
    card: 'border-border bg-card shadow-xs',
    accent: 'bg-risk',
    text: 'text-risk',
    muted: 'text-muted-foreground',
    chip: 'border-risk/30 bg-risk/10 text-risk font-medium',
  },
  neutral: {
    card: 'border-border bg-card shadow-xs',
    accent: 'bg-muted-foreground/30',
    text: 'text-foreground',
    muted: 'text-muted-foreground',
    chip: 'border-border bg-muted/60 text-muted-foreground font-medium',
  },
};

export function scoreSurface(score: number | null | undefined): ScoreSurface {
  const tone = scoreToTone(score);
  return { tone, ...SCORE_SURFACES[tone] };
}
