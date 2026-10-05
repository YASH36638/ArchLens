'use client';

import Link from 'next/link';
import { ArrowUpRight, GitBranch, Lock, Unlock } from 'lucide-react';
import type { DashboardRepoSnapshot } from '@/lib/assessment/recommendations';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AssessmentInfoButton } from './assessment-info-button';
import { ScoreRing } from '@/components/score/score-ring';
import { formatRelativeDate } from '@/lib/utils/format';
import { gradeLabel, scoreSurface, scoreToGrade } from '@/lib/utils/grade';
import { cn } from '@/lib/utils/cn';

interface DashboardRepoGridProps {
  repos: DashboardRepoSnapshot[];
}

export function DashboardRepoGrid({ repos }: DashboardRepoGridProps) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {repos.map((repo, index) => {
        const href = `/repos/${repo.owner}/${repo.name}`;
        const hasScore = repo.overall !== null;
        const canAssess = Boolean(repo.scanId && repo.scanStatus === 'completed' && hasScore);
        const surface = scoreSurface(repo.overall);
        const band = hasScore ? gradeLabel(scoreToGrade(repo.overall!)) : null;

        return (
          <div
            key={repo.id}
            className="page-enter relative"
            style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            data-testid="dashboard-repo-card"
          >
            {canAssess && repo.scanId ? (
              <AssessmentInfoButton
                scanId={repo.scanId}
                repoFullName={repo.fullName}
                repoHref={href}
              />
            ) : null}

            <Link
              href={href}
              className="group block cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ai"
            >
              <Card
                data-tone={surface.tone}
                className={cn(
                  'qa-interactive relative h-full overflow-hidden border-border/80 bg-card shadow-premium transition-all duration-200 ease-out hover:-translate-y-[2px] hover:border-primary/25 hover:shadow-premium-hover',
                  'hover:border-ai/30'
                )}
              >
                <div className={cn('absolute inset-x-0 top-0 h-1', surface.accent)} aria-hidden />

                <CardContent className="space-y-5 p-5 pt-6">
                  <div className="flex items-start justify-between gap-3 pr-8">
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <GitBranch className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <p className="truncate text-metadata font-medium tracking-wide text-muted-foreground">
                          {repo.owner}
                        </p>
                      </div>
                      <h3 className="truncate text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-ai">
                        {repo.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className="gap-1 border-border bg-muted/50 text-badge font-medium"
                        >
                          {repo.private ? (
                            <Lock className="h-2.5 w-2.5" />
                          ) : (
                            <Unlock className="h-2.5 w-2.5" />
                          )}
                          {repo.private ? 'Private' : 'Public'}
                        </Badge>
                        <Badge variant="secondary" className="text-badge">
                          {repo.defaultBranch}
                        </Badge>
                        {band ? (
                          <Badge
                            className={cn('border text-badge', surface.chip)}
                            variant="outline"
                          >
                            {band}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <ScoreRing score={repo.overall} size={80} />
                  </div>

                  <div className="flex items-center justify-between border-t border-border/80 pt-3.5">
                    <div className="text-metadata text-muted-foreground" suppressHydrationWarning>
                      {hasScore && repo.counts ? (
                        <span>
                          <span className="font-medium text-foreground">{repo.counts.modules}</span>{' '}
                          modules ·{' '}
                          <span className="font-medium text-foreground">{repo.counts.smells}</span>{' '}
                          smells
                        </span>
                      ) : repo.scanStatus ? (
                        <span>Scan {repo.scanStatus}</span>
                      ) : (
                        <span>No scans yet</span>
                      )}
                      {repo.updatedAt ? (
                        <span className="ml-1 opacity-70">
                          · {formatRelativeDate(repo.updatedAt)}
                        </span>
                      ) : null}
                    </div>
                    <span className="inline-flex items-center gap-0.5 text-button font-semibold text-ai opacity-0 transition-opacity group-hover:opacity-100">
                      Open
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
