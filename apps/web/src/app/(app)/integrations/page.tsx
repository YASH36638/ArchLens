import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { RepositoryDto } from '@archlens/shared-types';
import { AlertTriangle, ExternalLink, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConnectRepoForm } from '@/components/integrations/connect-repo-form';
import { EmptyState } from '@/components/shared/empty-state';
import { ApiError } from '@/lib/api/client';
import { listReposServer } from '@/lib/api/repos';
import { getSessionToken } from '@/lib/auth/server';

type LoadResult =
  | { kind: 'ok'; repos: RepositoryDto[] }
  | { kind: 'unauthorized' }
  | { kind: 'error'; message: string };

async function loadRepos(token: string): Promise<LoadResult> {
  try {
    const repos = await listReposServer(token);
    return { kind: 'ok', repos };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return { kind: 'unauthorized' };
    return {
      kind: 'error',
      message:
        e instanceof ApiError
          ? e.status === 0
            ? 'Cannot reach the Archlens API. Start the API on port 3001 and refresh.'
            : `API ${e.status}: ${e.statusText}`
          : e instanceof Error
            ? e.message
            : 'Unknown error',
    };
  }
}

export default async function IntegrationsPage() {
  const token = await getSessionToken();
  if (!token) redirect('/login');

  const result = await loadRepos(token);
  if (result.kind === 'unauthorized') redirect('/login?reauth=1');

  if (result.kind === 'error') {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4" data-testid="integrations-page">
        <p className="text-body text-muted-foreground">
          Connect GitHub repositories for architecture assessment.
        </p>
        <Card data-testid="integrations-error" role="alert">
          <CardHeader>
            <span className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-risk/10 text-risk">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
            <CardTitle>Could not load repositories</CardTitle>
            <CardDescription className="text-body">{result.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/integrations">Retry</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const repos = result.repos;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4" data-testid="integrations-page">
      <p className="text-body text-muted-foreground">
        Connect GitHub repositories for architecture assessment.
      </p>

      <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
        <ConnectRepoForm />

        <Card>
          <CardHeader>
            <CardTitle>Connected repositories</CardTitle>
          </CardHeader>
          <CardContent>
            {repos.length === 0 ? (
              <EmptyState
                icon={Github}
                title="No repositories connected"
                description="Use the form to connect your first GitHub repository."
                className="py-10"
              />
            ) : (
              <ul className="divide-y divide-border/60" data-testid="connected-repo-list">
                {repos.map((r) => (
                  <li
                    key={r.id}
                    className="flex min-h-10 flex-col gap-1 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/repos/${r.owner}/${r.name}`}
                        className="inline-flex min-h-8 max-w-full items-center rounded-md text-body font-semibold text-foreground transition-colors hover:text-primary"
                      >
                        <span className="truncate">{r.fullName}</span>
                      </Link>
                      <div className="text-metadata text-muted-foreground">
                        {r.private ? 'Private' : 'Public'} · {r.defaultBranch}
                      </div>
                    </div>
                    <a
                      href={r.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-md text-button text-muted-foreground transition-colors hover:text-foreground"
                    >
                      GitHub
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
