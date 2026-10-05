'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';

export type KpiTone = 'risk' | 'warning' | 'success' | 'system';

interface KpiRingCardProps {
  title: string;
  value: string;
  /** Short hint shown on the card, matching Projects KPI cards */
  caption: string;
  /** 0–100 fill for a real percentage. Null renders the value without a filled ring. */
  ringPercent: number | null;
  tone: KpiTone;
  /** Percent change shown on the card, e.g. "↓ 6%" or "↑ 47%" */
  delta?: string | null;
}

const RING_SIZE = 76;
const RING_STROKE = 6;

const TONE_SURFACE: Record<KpiTone, string> = {
  risk: 'bg-[#EF4444] shadow-[0_8px_24px_rgba(239,68,68,0.35)]',
  warning: 'bg-[#F59E0B] shadow-[0_8px_24px_rgba(245,158,11,0.35)]',
  success: 'bg-[#10B981] shadow-[0_8px_24px_rgba(16,185,129,0.35)]',
  system: 'bg-[#2563EB] shadow-[0_8px_24px_rgba(37,99,235,0.35)]',
};

const TONE_HOVER_SHADOW: Record<KpiTone, string> = {
  risk: 'hover:shadow-[0_18px_42px_rgba(239,68,68,0.45)]',
  warning: 'hover:shadow-[0_18px_42px_rgba(245,158,11,0.45)]',
  success: 'hover:shadow-[0_18px_42px_rgba(16,185,129,0.45)]',
  system: 'hover:shadow-[0_18px_42px_rgba(37,99,235,0.45)]',
};

export function KpiRingCard({
  title,
  value,
  caption,
  ringPercent,
  tone,
  delta,
}: KpiRingCardProps) {
  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const fill = Math.max(0, Math.min(100, ringPercent ?? 0));
  const targetDash = (fill / 100) * circumference;
  const [dash, setDash] = useState(0);

  useEffect(() => {
    if (ringPercent === null) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setDash(targetDash);
      return;
    }
    setDash(0);
    const frame = requestAnimationFrame(() => setDash(targetDash));
    return () => cancelAnimationFrame(frame);
  }, [ringPercent, targetDash]);

  return (
    // Outer slot keeps layout fixed so hover transform never shifts the page
    <div className="relative z-0 h-full hover:z-30">
      <div
        className={cn(
          'group/kpi relative flex h-full min-h-[108px] w-full items-center gap-3.5 rounded-xl border-0 p-4 text-left text-white',
          'origin-center will-change-transform',
          'transition-[transform,box-shadow,filter] duration-200 ease-out',
          'hover:-translate-y-2 hover:scale-[1.03] hover:brightness-110',
          TONE_SURFACE[tone],
          TONE_HOVER_SHADOW[tone]
        )}
        data-testid="dashboard-kpi"
      >
        {ringPercent === null ? (
          <div
            className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-full border-[6px] border-white/30 transition-transform duration-200 ease-out group-hover/kpi:scale-105"
            role="img"
            aria-label={`${title}: ${value}${delta ? `, ${delta}` : ''}. ${caption}`}
          >
            <span className="text-[28px] font-bold leading-none tracking-tight tabular-nums text-white">
              {value}
            </span>
          </div>
        ) : (
          <div
            className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center transition-transform duration-200 ease-out group-hover/kpi:scale-105 group-hover/kpi:drop-shadow-[0_0_12px_rgba(255,255,255,0.35)]"
            role="img"
            aria-label={`${title}: ${Math.round(fill)} out of 100${delta ? `, ${delta}` : ''}. ${caption}`}
          >
            <svg
              width={RING_SIZE}
              height={RING_SIZE}
              viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
              className="-rotate-90"
              aria-hidden
            >
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={RING_STROKE}
                className="text-white/25"
              />
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circumference}`}
                className="text-white"
                style={{ transition: 'stroke-dasharray 700ms ease-out' }}
              />
            </svg>
            <span className="absolute text-[28px] font-bold leading-none tracking-tight tabular-nums text-white">
              {value}
            </span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/85">{title}</p>
          {delta ? (
            <p className="mt-2 text-[20px] font-bold leading-none tracking-tight tabular-nums text-white">
              {delta}
            </p>
          ) : null}
          <p className="mt-2 text-[12px] leading-4 text-white/75">{caption}</p>
        </div>
      </div>
    </div>
  );
}
