import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FolderGit2 } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProjectsRepoList } from '@/components/projects/projects-repo-list';
import { getSessionToken } from '@/lib/auth/server';
import { ApiError } from '@/lib/api/client';
import { loadProjectSnapshots } from '@/lib/api/projects-loader';

type FocusParam = 'attention' | 'issues' | 'stale';

function parseFocus(value: string | undefined): FocusParam | null {
  if (value === 'attention' || value === 'issues' || value === 'stale') return value;
  return null;
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams?: { focus?: string };
}) {
  const token = await getSessionToken();
  if (!token) redirect('/login');

  const initialFocus = parseFocus(searchParams?.focus);

  let result: Awaited<ReturnType<typeof loadProjectSnapshots>>;
  try {
    result = await loadProjectSnapshots(token);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect('/login?reauth=1');
    throw e;
  }

  if (result.kind === 'error') {
    return (
      <div data-testid="projects">
        <Card data-testid="projects-error">
          <CardHeader>
            <CardTitle>Could not load projects</CardTitle>
            <CardDescription>{result.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href="/integrations">Manage repositories</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const repos = result.repos;

  return (
    <div data-testid="projects">
      {repos.length === 0 ? (
        <Card className="overflow-hidden rounded-2xl border-border shadow-premium">
          <EmptyState
            icon={FolderGit2}
            title="No repositories yet"
            description="Connect a GitHub repository to start scanning architecture health, smells, and portfolio insights."
            actionLabel="Connect a repository"
            actionHref="/integrations"
            testId="projects-empty"
          />
        </Card>
      ) : (
        <ProjectsRepoList repos={repos} initialFocus={initialFocus} />
      )}
    </div>
  );
}
