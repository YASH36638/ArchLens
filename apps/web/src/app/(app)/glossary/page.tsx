import type { MetricDefinitionDto, SmellDefinitionDto } from '@archlens/shared-types';
import { GlossaryClient } from '@/components/glossary/glossary-client';
import { getMetricCatalogServer } from '@/lib/api/metric-catalog';
import { getSmellCatalogServer } from '@/lib/api/smell-catalog';

export const metadata = {
  title: 'Glossary · Archlens',
};

interface PageProps {
  searchParams?: { tab?: string };
}

export default async function GlossaryPage({ searchParams }: PageProps) {
  const [metrics, smells] = await Promise.all([
    getMetricCatalogServer().catch(() => [] as MetricDefinitionDto[]),
    getSmellCatalogServer().catch(() => [] as SmellDefinitionDto[]),
  ]);

  const initialTab = searchParams?.tab === 'smells' ? 'smells' : 'metrics';

  return <GlossaryClient metrics={metrics} smells={smells} initialTab={initialTab} />;
}
