'use client';

import {
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import type { HotspotDto } from '@archlens/shared-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  hotspots: HotspotDto[];
}

function riskFill(risk: number, max: number): string {
  const t = max > 0 ? risk / max : 0;
  if (t >= 0.75) return 'hsl(var(--risk) / 0.85)';
  if (t >= 0.5) return 'hsl(var(--risk) / 0.55)';
  if (t >= 0.25) return 'hsl(var(--warning) / 0.7)';
  return 'hsl(var(--success) / 0.7)';
}

function riskLevel(risk: number, max: number): string {
  const ratio = max > 0 ? risk / max : 0;
  if (ratio >= 0.75) return 'critical';
  if (ratio >= 0.5) return 'high';
  if (ratio >= 0.25) return 'moderate';
  return 'lower';
}

export function HotspotScatter({ hotspots }: Props) {
  const data = hotspots.map((h) => ({
    x: h.churn,
    y: h.complexity,
    z: Math.max(20, h.riskScore * 6),
    path: h.path,
    smells: h.smellCount,
    risk: h.riskScore,
  }));
  const maxRisk = Math.max(...data.map((d) => d.risk), 1);
  const highestRisk = [...data].sort((a, b) => b.risk - a.risk).slice(0, 3);

  return (
    <Card data-testid="hotspot-scatter">
      <CardHeader>
        <CardTitle className="text-base font-medium text-muted-foreground">
          Risk map · churn × complexity
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[280px]">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No hotspots in this scan.
          </div>
        ) : (
          <div
            className="h-full"
            role="img"
            aria-label={`Risk map with ${data.length} hotspots. Highest risk: ${highestRisk
              .map(
                (item) =>
                  `${item.path}, risk ${item.risk.toFixed(1)}, ${riskLevel(item.risk, maxRisk)}`
              )
              .join('; ')}.`}
          >
            <ResponsiveContainer width="100%" height="calc(100% - 24px)" minHeight={220}>
              <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} opacity={0.4} />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Churn"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 13 }}
                  label={{
                    value: 'Churn',
                    position: 'insideBottom',
                    offset: -2,
                    fontSize: 13,
                    fill: 'hsl(var(--muted-foreground))',
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Complexity"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 13 }}
                  label={{
                    value: 'Complexity',
                    angle: -90,
                    position: 'insideLeft',
                    fontSize: 13,
                    fill: 'hsl(var(--muted-foreground))',
                  }}
                />
                <ZAxis type="number" dataKey="z" range={[40, 400]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const p = payload[0]?.payload as (typeof data)[number] | undefined;
                    if (!p) return null;
                    return (
                      <div className="rounded-md border bg-background px-3 py-2 text-metadata shadow-md">
                        <div className="font-mono font-medium">{p.path}</div>
                        <div className="mt-1 text-muted-foreground">
                          complexity {p.y} · churn {p.x} · smells {p.smells} · risk{' '}
                          {p.risk.toFixed(1)} ({riskLevel(p.risk, maxRisk)})
                        </div>
                      </div>
                    );
                  }}
                />
                <Scatter data={data}>
                  {data.map((d) => (
                    <Cell key={d.path} fill={riskFill(d.risk, maxRisk)} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            <p className="text-center text-metadata text-muted-foreground">
              Risk bands: lower · moderate · high · critical; bubble size also increases with risk
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
