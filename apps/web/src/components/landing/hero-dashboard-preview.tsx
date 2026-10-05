'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { FileText, Gauge, GitBranch, Shield, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type PanelKey = 'risk' | 'dependency' | 'documentation';

const METRICS = [
  { id: 'architecture', label: 'Architecture Health', value: 84 },
  { id: 'hygiene', label: 'Repository Hygiene', value: 91 },
  { id: 'security', label: 'Security Score', value: 88 },
] as const;

const BLUE = 'hsl(var(--landing-blue))';
const TRACK = 'hsl(var(--landing-track))';

function ScoreRing({ score }: { score: number }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-[clamp(7.5rem,16vh,8.75rem)] w-[clamp(7.5rem,16vh,8.75rem)] shrink-0 items-center justify-center">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="60" cy="60" r={radius} fill="none" stroke={TRACK} strokeWidth="11" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={BLUE}
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={
              {
                '--ring-circ': circumference,
                '--ring-offset': offset,
              } as CSSProperties
            }
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[clamp(1.5rem,3vh,2rem)] font-extrabold leading-none tabular-nums text-[hsl(var(--landing-navy))]">
            {score}
          </span>
          <span className="mt-0.5 text-[11px] font-semibold text-[hsl(var(--landing-muted))]">
            / 100
          </span>
        </div>
      </div>
      <p className="mt-1 text-[10px] font-semibold text-[hsl(var(--landing-muted))]">
        Repository Score
      </p>
    </div>
  );
}

export function HeroDashboardPreview() {
  const [activeMetric, setActiveMetric] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null);

  return (
    <div
      className="relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden p-[clamp(0.75rem,2vh,1.5rem)]"
      aria-label="Interactive engineering health preview"
    >
      <div className="landing-hero-glow absolute inset-0" />
      <div className="landing-hero-orb landing-hero-orb-a absolute" aria-hidden="true" />
      <div className="landing-hero-orb landing-hero-orb-b absolute" aria-hidden="true" />

      <div className="relative w-full max-w-[min(440px,90%)] space-y-[clamp(0.5rem,1.2vh,0.75rem)]">
        {/* Main card */}
        <div className="rounded-2xl border border-[hsl(var(--landing-border))] bg-white p-[clamp(0.875rem,1.8vh,1.25rem)] shadow-[0_10px_40px_rgba(15,23,42,0.08)]">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-[hsl(var(--landing-blue))]" aria-hidden="true" />
              <p className="font-mono text-[13px] font-semibold text-[hsl(var(--landing-navy))]">
                acme/payments-core
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              Healthy
            </span>
          </div>

          <div className="flex items-center gap-4">
            <ScoreRing score={92} />
            <div className="min-w-0 flex-1 space-y-2.5">
              {METRICS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveMetric(activeMetric === m.id ? null : m.id)}
                  aria-pressed={activeMetric === m.id}
                  className={cn(
                    'w-full rounded-md px-0.5 py-0.5 text-left',
                    activeMetric === m.id && 'bg-blue-50/80'
                  )}
                >
                  <div className="mb-0.5 flex justify-between text-[11px]">
                    <span className="font-semibold text-[hsl(var(--landing-muted))]">
                      {m.label}
                    </span>
                    <span className="font-bold tabular-nums text-[hsl(var(--landing-navy))]">
                      {m.value}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[hsl(var(--landing-track))]">
                    <div
                      className="h-full rounded-full bg-[hsl(var(--landing-blue))]"
                      style={{ width: `${m.value}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* AI Insight */}
        <button
          type="button"
          onClick={() => setActivePanel(activePanel === 'documentation' ? null : 'documentation')}
          className={cn(
            'flex w-full items-center gap-2 rounded-xl border border-blue-100 bg-[hsl(var(--landing-insight-bg))] px-3.5 py-2.5 text-left',
            activePanel === 'documentation' && 'border-blue-200'
          )}
        >
          <Sparkles
            className="h-4 w-4 shrink-0 text-[hsl(var(--landing-blue))]"
            aria-hidden="true"
          />
          <p className="text-[13px] font-medium leading-snug text-[hsl(var(--landing-navy))]">
            <span className="font-bold">AI Insight:</span> Documentation coverage improved by 18%
            this month.
          </p>
        </button>

        {/* Bottom row */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setActivePanel(activePanel === 'risk' ? null : 'risk')}
            aria-pressed={activePanel === 'risk'}
            className={cn(
              'rounded-xl border border-[hsl(var(--landing-border))] bg-white p-3 text-left shadow-[0_4px_18px_rgba(15,23,42,0.06)]',
              activePanel === 'risk' && 'border-blue-200 bg-blue-50/30'
            )}
          >
            <div className="mb-1.5 flex items-center gap-1.5">
              <Shield
                className="h-3.5 w-3.5 text-[hsl(var(--landing-warning))]"
                aria-hidden="true"
              />
              <p className="text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--landing-muted))]">
                Repository Risk
              </p>
            </div>
            <p className="text-[13px] font-bold text-[hsl(var(--landing-navy))]">
              High Coupling Detected
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-[hsl(var(--landing-body))]">
              Impact:{' '}
              <span className="font-semibold text-[hsl(var(--landing-warning))]">Medium</span>
            </p>
            <p className="mt-1.5 text-[11px] font-semibold text-[hsl(var(--landing-blue))]">
              Recommendation: Refactor Authentication Module
            </p>
          </button>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => setActivePanel(activePanel === 'dependency' ? null : 'dependency')}
              aria-pressed={activePanel === 'dependency'}
              className={cn(
                'rounded-xl border border-[hsl(var(--landing-border))] bg-white p-3 text-left shadow-[0_4px_18px_rgba(15,23,42,0.06)]',
                activePanel === 'dependency' && 'border-blue-200 bg-blue-50/30'
              )}
            >
              <div className="mb-1 flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5 text-[hsl(var(--landing-blue))]" aria-hidden="true" />
                <p className="text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--landing-muted))]">
                  Dependency Health
                </p>
              </div>
              <p className="text-[11px] font-semibold text-[hsl(var(--landing-navy))]">
                Approved Libraries <span className="text-[hsl(var(--landing-success))]">97%</span>
              </p>
              <p className="text-[11px] font-semibold text-[hsl(var(--landing-navy))]">
                Outdated Packages <span className="text-[hsl(var(--landing-warning))]">2</span>
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setActivePanel(activePanel === 'documentation' ? null : 'documentation')
              }
              aria-pressed={activePanel === 'documentation'}
              className={cn(
                'rounded-xl border border-[hsl(var(--landing-border))] bg-white p-3 text-left shadow-[0_4px_18px_rgba(15,23,42,0.06)]',
                activePanel === 'documentation' && 'border-blue-200 bg-blue-50/30'
              )}
            >
              <div className="mb-1 flex items-center gap-1.5">
                <FileText
                  className="h-3.5 w-3.5 text-[hsl(var(--landing-blue))]"
                  aria-hidden="true"
                />
                <p className="text-[9px] font-bold uppercase tracking-wider text-[hsl(var(--landing-muted))]">
                  Documentation Health
                </p>
              </div>
              <p className="text-[11px] font-semibold text-[hsl(var(--landing-navy))]">
                Coverage <span className="text-[hsl(var(--landing-navy))]">82%</span>
              </p>
              <p className="text-[11px] font-semibold text-[hsl(var(--landing-navy))]">
                README Score <span className="text-[hsl(var(--landing-success))]">95%</span>
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
