'use client';

import { useHotspots } from '@/hooks/use-hotspots';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HotspotScatter } from './hotspot-scatter';
import { HotspotList } from './hotspot-list';

interface Props {
  scanId: string;
}

export function HotspotsView({ scanId }: Props) {
  const { data, isLoading, isError, error } = useHotspots(scanId);

  if (isLoading) {
    return (
      <Card data-testid="hotspots-loading">
        <CardHeader>
          <CardTitle className="text-base text-muted-foreground">Loading hotspots…</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card data-testid="hotspots-error">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Failed to load hotspots</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'Unknown error'}
        </CardContent>
      </Card>
    );
  }

  const hotspots = data ?? [];
  const ranked = hotspots.slice().sort((a, b) => b.riskScore - a.riskScore);
  const maxRisk = Math.max(...ranked.map((item) => item.riskScore), 1);
  const highBand = ranked.filter((item) => item.riskScore / maxRisk >= 0.5).length;
  const topThree = ranked.slice(0, 3);

  return (
    <div className="space-y-4" data-testid="hotspots-view">
      <p className="text-body text-muted-foreground">
        {hotspots.length === 0
          ? 'No hotspot files in this scan.'
          : `${highBand} ${highBand === 1 ? 'file is' : 'files are'} in the high or critical risk band.`}
        {topThree.length > 0 ? (
          <>
            {' '}
            Top files:{' '}
            {topThree.map((item, index) => (
              <span key={item.fileId}>
                {index > 0 ? ', ' : ''}
                <span className="font-mono text-foreground">{item.path}</span>
              </span>
            ))}
            .
          </>
        ) : null}
      </p>
      <HotspotScatter hotspots={hotspots} />
      <div className="space-y-2">
        <h2 className="text-section-title text-foreground">All hotspots</h2>
        <HotspotList hotspots={hotspots} />
      </div>
    </div>
  );
}
