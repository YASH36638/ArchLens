'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { scoreToGrade } from '@/lib/utils/grade';

export interface ScanHistogramPoint {
  label: string;
  score: number;
  ref: string;
  date: string;
}

interface ScanHistogramProps {
  points: ScanHistogramPoint[];
}

export function ScanHistogram({ points }: ScanHistogramProps) {
  const average =
    points.length === 0
      ? null
      : Math.round(points.reduce((sum, point) => sum + point.score, 0) / points.length);
  const latest = points.at(-1);

  return (
    <Card className="flex h-full flex-col" data-testid="scan-histogram">
      <CardHeader className="space-y-1 p-4 pb-0">
        <CardTitle className="text-card-title font-bold text-foreground">Score history</CardTitle>
        <CardDescription
          className="truncate text-metadata leading-5 text-muted-foreground"
          title="Completed scans labeled by date and branch — not every git commit."
        >
          {average === null
            ? 'Completed scans by date and branch'
            : `Avg ${average} · completed scans (not every commit)`}
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 p-3 pt-1">
        {points.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-[13px] text-muted-foreground">
            No completed scans yet.
          </div>
        ) : (
          <div
            className="flex h-[200px] flex-col"
            role="img"
            aria-label={`Score history for ${points.length} scans. Average ${average}. Latest scan ${latest?.ref ?? ''} scored ${latest?.score ?? 0}, grade ${scoreToGrade(latest?.score ?? 0)}.`}
          >
            <div className="min-h-0 flex-1">
              <ResponsiveContainer width="100%" height="100%" minHeight={150}>
                <LineChart data={points} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" vertical={false} opacity={0.4} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 13 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 13 }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                  />
                  <Tooltip
                    formatter={(value) => {
                      const n = typeof value === 'number' ? value : Number(value);
                      return [`${Math.round(n)}`, 'Score'];
                    }}
                    labelFormatter={(_, payload) => {
                      const point = payload?.[0]?.payload as ScanHistogramPoint | undefined;
                      return point ? `${point.date} · ${point.ref}` : '';
                    }}
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--popover))',
                      boxShadow: '0 4px 12px hsl(var(--foreground) / 0.08)',
                      fontSize: '12px',
                      color: 'hsl(var(--popover-foreground))',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3.5, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="shrink-0 pt-1 text-center text-metadata text-muted-foreground">
              A–B good · C watch · D–E needs attention
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
