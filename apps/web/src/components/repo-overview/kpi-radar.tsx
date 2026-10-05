import type { ScoreBreakdown } from '@archlens/shared-types';
import { MetricRadarCard } from './metric-radar-card';

export function KpiRadar({ breakdown }: { breakdown: ScoreBreakdown }) {
  const data = [
    { axis: 'Complexity', value: Math.round(breakdown.complexity) },
    { axis: 'Duplication', value: Math.round(breakdown.duplication) },
    { axis: 'Coupling', value: Math.round(breakdown.coupling) },
    { axis: 'Cohesion', value: Math.round(breakdown.cohesion) },
    { axis: 'Smells', value: Math.round(breakdown.smells) },
  ];

  return (
    <MetricRadarCard
      title="Architecture KPIs"
      description="Latest scan scores for complexity, duplication, coupling, cohesion, and smells."
      data={data}
      testId="kpi-radar"
      color="#2563EB"
    />
  );
}
