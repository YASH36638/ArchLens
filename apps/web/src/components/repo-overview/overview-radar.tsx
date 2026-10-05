import type { ScoreBreakdown } from '@archlens/shared-types';
import { overviewRadarFromReport } from '@/lib/assessment/overview-kpis';
import { MetricRadarCard } from './metric-radar-card';

interface OverviewRadarProps {
  breakdown: ScoreBreakdown;
  presentSmellKinds: readonly string[];
}

export function OverviewRadar({ breakdown, presentSmellKinds }: OverviewRadarProps) {
  return (
    <MetricRadarCard
      title="KPI hexagon"
      description="Health, modularity, architecture KPIs, and hygiene."
      data={overviewRadarFromReport(breakdown, presentSmellKinds)}
      testId="overview-radar"
      color="#2563EB"
      compact
    />
  );
}
