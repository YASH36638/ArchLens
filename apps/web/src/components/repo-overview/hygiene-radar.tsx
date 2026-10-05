import { hygieneRadarFromSmellKinds } from '@/lib/assessment/hygiene-radar';
import { MetricRadarCard } from './metric-radar-card';

export function HygieneRadar({ presentSmellKinds }: { presentSmellKinds: readonly string[] }) {
  return (
    <MetricRadarCard
      title="Repo hygiene"
      description="Presence checks from the latest scan — 100 if the smell is absent, 0 if found. Not a documentation quality score."
      data={hygieneRadarFromSmellKinds(presentSmellKinds)}
      testId="hygiene-radar"
      color="#16A34A"
    />
  );
}
