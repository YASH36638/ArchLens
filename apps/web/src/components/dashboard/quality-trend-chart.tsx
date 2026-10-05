'use client';

import { useMemo } from 'react';
import type { DashboardWeekPointDto } from '@archlens/shared-types';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface QualityTrendChartProps {
  weekly: DashboardWeekPointDto[];
}

export function QualityTrendChart({ weekly }: QualityTrendChartProps) {
  const data = useMemo(
    () =>
      weekly.map((point) => ({
        ...point,
        avgScore: point.avgScore === null ? null : Math.round(point.avgScore * 10) / 10,
        avgSmells: point.avgSmells === null ? 0 : Math.round(point.avgSmells * 10) / 10,
      })),
    [weekly]
  );

  const scoreDomain = useMemo(() => {
    const scores = data
      .map((point) => point.avgScore)
      .filter((score): score is number => typeof score === 'number');
    if (scores.length === 0) return [0, 100] as [number, number];
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const pad = Math.max(3, Math.round((max - min) * 0.12));
    return [Math.max(0, Math.floor(min - pad)), Math.min(100, Math.ceil(max + pad))] as [
      number,
      number,
    ];
  }, [data]);

  const issuesDomain = useMemo(() => {
    const values = data.map((point) => point.avgSmells);
    const max = Math.max(0, ...values);
    // Tighter domain so bars read taller / more prominent
    return [0, Math.max(8, Math.ceil(max * 1.15))] as [number, number];
  }, [data]);

  const latest = data.at(-1);

  return (
    <div
      className="h-full min-h-[220px] w-full sm:min-h-[260px]"
      data-testid="dashboard-quality-chart"
      role="img"
      aria-label={
        latest
          ? `Quality trend for ${data.length} active weeks. Latest average score ${latest.avgScore ?? 'n/a'} and average issues ${latest.avgSmells}.`
          : 'Quality trend has no weekly data.'
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="hsl(var(--border))" vertical={false} opacity={0.22} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#94A3B8', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickMargin={6}
          />
          <YAxis
            yAxisId="score"
            domain={scoreDomain}
            tick={{ fill: '#94A3B8', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <YAxis
            yAxisId="issues"
            orientation="right"
            domain={issuesDomain}
            allowDecimals={false}
            tick={{ fill: '#94A3B8', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: '1px solid rgba(226,232,240,0.2)',
              backgroundColor: '#0F172A',
              boxShadow: '0 6px 16px rgba(8,17,31,0.35)',
              fontSize: '12px',
              color: '#E2E8F0',
            }}
            formatter={(value, name) => {
              const n = typeof value === 'number' ? value : Number(value);
              return name === 'avgScore' || name === 'Average score'
                ? [`${n}`, 'Average score']
                : [`${n}`, 'Average issues'];
            }}
            labelFormatter={(label) => String(label)}
          />
          <Bar
            yAxisId="issues"
            dataKey="avgSmells"
            name="Average issues"
            fill="rgba(245,158,11,0.72)"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
          />
          <Line
            yAxisId="score"
            type="monotone"
            dataKey="avgScore"
            name="Average score"
            stroke="#4F8CFF"
            strokeWidth={2.75}
            connectNulls={false}
            dot={{ r: 4, fill: '#4F8CFF', strokeWidth: 0 }}
            activeDot={{ r: 5.5, fill: '#4F8CFF', stroke: '#fff', strokeWidth: 1.5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
