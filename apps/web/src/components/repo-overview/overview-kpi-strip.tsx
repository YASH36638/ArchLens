import type { ScoreBreakdown } from '@archlens/shared-types';
import { KpiRingCard } from '@/components/dashboard/kpi-ring-card';
import { overviewKpisFromReport } from '@/lib/assessment/overview-kpis';
import { formatScore } from '@/lib/utils/format';

interface OverviewKpiStripProps {
  breakdown: ScoreBreakdown;
  presentSmellKinds: readonly string[];
}

export function OverviewKpiStrip({ breakdown, presentSmellKinds }: OverviewKpiStripProps) {
  const kpis = overviewKpisFromReport(breakdown, presentSmellKinds);

  return (
    <section
      className="grid grid-cols-1 gap-3 md:grid-cols-3"
      data-testid="overview-kpi-strip"
      aria-label="Repository health summary"
    >
      <KpiRingCard
        title="Code health"
        value={formatScore(kpis.codeHealth)}
        caption="Overall health from the latest completed scan"
        ringPercent={kpis.codeHealth}
        tone="system"
      />
      <KpiRingCard
        title="Modularity"
        value={formatScore(kpis.modularity)}
        caption="Average coupling and cohesion score"
        ringPercent={kpis.modularity}
        tone="success"
      />
      <KpiRingCard
        title="Developer experience"
        value={formatScore(kpis.dxScore)}
        caption="Hygiene signals from project setup"
        ringPercent={kpis.dxScore}
        tone="success"
      />
    </section>
  );
}
