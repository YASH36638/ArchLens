import { Card } from '@/components/ui/card';
import { formatScore } from '@/lib/utils/format';
import { scoreSurface } from '@/lib/utils/grade';
import { cn } from '@/lib/utils/cn';

interface RatingTileProps {
  label: string;
  score: number;
  /** Short label shown as a chip when the metric is "off" or "limited signal". */
  note?: string;
  /** Longer text explaining how the score was computed; renders as a `title=` tooltip. */
  derivation?: string;
}

export function RatingTile({ label, score, note, derivation }: RatingTileProps) {
  const titleText = derivation ? (note ? `${derivation}\n\nNote: ${note}` : derivation) : note;
  const surface = scoreSurface(score);
  return (
    <Card
      className={cn(
        'relative overflow-hidden p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
        surface.card
      )}
      data-testid="rating-tile"
      data-label={label}
      data-tone={surface.tone}
      title={titleText}
    >
      <div className={cn('absolute inset-y-0 left-0 w-1.5', surface.accent)} aria-hidden />
      <div>
        <div className={cn('text-metadata font-semibold uppercase tracking-wider', surface.muted)}>
          {label}
        </div>
        <div className={cn('mt-1 text-2xl font-extrabold tracking-tight', surface.text)}>
          {formatScore(score)}
        </div>
        {note ? (
          <div className="mt-1 text-badge font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            {note.length > 32 ? `${note.slice(0, 32)}…` : note}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
