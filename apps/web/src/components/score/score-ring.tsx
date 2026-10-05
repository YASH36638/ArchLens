'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { scoreToTone, type ScoreTone } from '@/lib/utils/grade';

const TONE_STROKE: Record<ScoreTone, string> = {
  excellent: 'stroke-success',
  good: 'stroke-success',
  fair: 'stroke-warning',
  poor: 'stroke-risk',
  critical: 'stroke-risk',
  neutral: 'stroke-muted-foreground/30',
};

interface ScoreRingProps {
  score: number | null;
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
}

export function ScoreRing({ score, size = 72, strokeWidth = 6, className, label }: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const clamped = score == null ? 0 : Math.max(0, Math.min(100, score));
  const targetOffset = circ - (clamped / 100) * circ;
  const tone = scoreToTone(score);
  const [offset, setOffset] = useState(circ);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setOffset(targetOffset);
      return;
    }

    setOffset(circ);
    const frame = requestAnimationFrame(() => {
      setOffset(targetOffset);
    });
    return () => cancelAnimationFrame(frame);
  }, [circ, targetOffset]);

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      aria-label={label ?? (score == null ? 'No score' : `Score ${Math.round(score)}`)}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-muted-foreground/20"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={cn(TONE_STROKE[tone])}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 700ms ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            'font-semibold tabular-nums tracking-tight text-foreground',
            size >= 76 ? 'text-2xl' : 'text-lg'
          )}
        >
          {score == null ? '—' : Math.round(score)}
        </span>
        {score != null ? (
          <span className="text-metadata font-medium text-muted-foreground">/100</span>
        ) : null}
      </div>
    </div>
  );
}
