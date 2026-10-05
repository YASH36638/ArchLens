'use client';

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatScore } from '@/lib/utils/format';
import { scoreSurface } from '@/lib/utils/grade';
import { cn } from '@/lib/utils/cn';
import type { AssessmentSection } from '@archlens/shared-types';

interface SectionRadarCardProps {
  section: AssessmentSection;
  color: string;
  weakest?: boolean;
}

export function SectionRadarCard({ section, color, weakest = false }: SectionRadarCardProps) {
  const surface = scoreSurface(section.score);
  const measuredAxes = section.axes.filter((axis) => axis.status !== 'na');
  const data = measuredAxes.map((axis) => ({ axis: axis.label, value: axis.value }));
  const naAxes = section.axes.filter((axis) => axis.status === 'na');
  const summary = data.map((point) => `${point.axis} ${point.value}`).join(', ');

  return (
    <Card
      data-testid={`${section.id}-section-radar`}
      data-weakest={weakest ? 'true' : 'false'}
      className={cn('flex h-full min-h-0 flex-col', weakest ? 'border-risk/40' : 'border-border')}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 p-4 pb-1">
        <div className="min-w-0">
          <CardTitle className="text-card-title font-bold leading-5 text-foreground">
            {section.title}
          </CardTitle>
          {weakest ? (
            <p className="mt-0.5 text-metadata font-medium text-risk">Needs attention</p>
          ) : null}
        </div>
        <div
          className={cn(
            'inline-flex min-h-9 min-w-[3.25rem] shrink-0 items-center justify-center rounded-lg border px-2.5 py-1 font-mono text-xl font-bold tabular-nums leading-none',
            surface.chip
          )}
          data-testid={`${section.id}-section-score`}
        >
          {formatScore(section.score)}
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col p-4 pt-0">
        <div
          className="min-h-[160px] flex-1"
          role="img"
          aria-label={`${section.title} ${formatScore(section.score)} out of 100. ${summary}.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
              <PolarGrid stroke="hsl(var(--border))" opacity={0.45} />
              <PolarAngleAxis
                dataKey="axis"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 13, fontWeight: 500 }}
              />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="Score"
                dataKey="value"
                stroke={color}
                fill={color}
                fillOpacity={0.16}
                strokeWidth={1.5}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        {naAxes.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {naAxes.map((axis) => (
              <span
                key={axis.id}
                className="rounded-full bg-muted px-2 py-0.5 text-metadata text-muted-foreground"
                title={axis.measurementNote}
              >
                {axis.label}: N/A
              </span>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
