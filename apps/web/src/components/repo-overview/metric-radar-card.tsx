'use client';

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface RadarAxisPoint {
  axis: string;
  value: number;
}

interface MetricRadarCardProps {
  title: string;
  description: string;
  data: RadarAxisPoint[];
  testId: string;
  color?: string;
  /** Tighter header + chart for above-the-fold Overview layouts. */
  compact?: boolean;
}

export function MetricRadarCard({
  title,
  description,
  data,
  testId,
  color = 'hsl(var(--primary))',
  compact = false,
}: MetricRadarCardProps) {
  const summary = data.map((point) => `${point.axis} ${Math.round(point.value)}`).join(', ');

  return (
    <Card
      className="h-full rounded-[14px] border-border bg-card shadow-xs transition-colors duration-150 hover:border-foreground/20"
      data-testid={testId}
    >
      <CardHeader className={compact ? 'space-y-1 p-3 pb-0' : 'p-4 pb-0'}>
        <CardTitle
          className={
            compact
              ? 'text-[14px] font-semibold text-foreground'
              : 'text-[15px] font-semibold text-foreground'
          }
        >
          {title}
        </CardTitle>
        <CardDescription
          className={compact ? 'line-clamp-2 text-[12px] leading-4' : 'text-[14px] leading-5'}
        >
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent
        className={compact ? 'h-[200px] p-3 pt-0' : 'h-[220px] p-4 pt-1'}
        role="img"
        aria-label={`${title}. Scores out of 100: ${summary || 'no metrics available'}.`}
      >
        <ResponsiveContainer width="100%" height="100%" minHeight={compact ? 160 : 180}>
          <RadarChart data={data} cx="50%" cy="50%" outerRadius={compact ? '68%' : '62%'}>
            <PolarGrid stroke="hsl(var(--border))" opacity={0.8} />
            <PolarAngleAxis
              dataKey="axis"
              tick={{
                fill: 'hsl(var(--muted-foreground))',
                fontSize: compact ? 11 : 14,
                fontWeight: 500,
              }}
            />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip
              formatter={(value) => {
                const n = typeof value === 'number' ? value : Number(value);
                return [`${Math.round(n)}`, 'Score'];
              }}
              contentStyle={{
                borderRadius: 8,
                border: '1px solid hsl(var(--border))',
                backgroundColor: 'hsl(var(--popover))',
                boxShadow: '0 4px 12px hsl(var(--foreground) / 0.08)',
                fontSize: compact ? '12px' : '14px',
                color: 'hsl(var(--popover-foreground))',
              }}
            />
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
      </CardContent>
    </Card>
  );
}
