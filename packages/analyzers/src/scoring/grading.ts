import type { Grade } from '../ir/types.js';

/**
 * Carrier grade bands mapped onto IR Grade (A–E):
 *   95–100 A+ → A
 *   90–94  A  → A
 *   85–89  B+ → B
 *   80–84  B  → B
 *   70–79  C  → C
 *   60–69  D  → D
 *   &lt;60   F  → E
 */
export function scoreToGrade(score: number): Grade {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'E';
}

/** Full Carrier letter including plus tiers (for display). */
export function scoreToCarrierGradeLabel(score: number): string {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'B+';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}
