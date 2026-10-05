import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatScore } from '@/lib/utils/format';
import { gradeLabel, scoreSurface, scoreToGrade } from '@/lib/utils/grade';
import { ScoreRing } from '@/components/score/score-ring';
import { cn } from '@/lib/utils/cn';

interface ScoreCardProps {
  score: number;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function ScoreCard({ score, title = 'Overall score', subtitle, className }: ScoreCardProps) {
  const surface = scoreSurface(score);
  const band = gradeLabel(scoreToGrade(score));

  return (
    <Card
      data-testid="score-card"
      data-tone={surface.tone}
      className={cn('relative flex h-full flex-col overflow-hidden', className)}
    >
      <div className={cn('absolute inset-x-0 top-0 h-1', surface.accent)} aria-hidden />
      <CardHeader className="space-y-1 p-4 pb-0">
        <CardTitle className="text-card-title font-bold text-foreground">{title}</CardTitle>
        {subtitle ? (
          <CardDescription className="line-clamp-3 text-metadata leading-5">
            {subtitle}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-4 pt-2">
        <ScoreRing score={score} size={80} strokeWidth={7} />
        <p className="text-center text-metadata font-medium text-muted-foreground">{band}</p>
        <span className="sr-only" data-testid="score-value">
          {formatScore(score)}
        </span>
      </CardContent>
    </Card>
  );
}
