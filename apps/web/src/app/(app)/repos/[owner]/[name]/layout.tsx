import type { ReactNode } from 'react';
import { RepoTabs } from '@/components/layout/repo-tabs';
import { getSessionToken } from '@/lib/auth/server';
import { loadRepoContext } from '@/lib/api/repo-loader';

interface Props {
  params: { owner: string; name: string };
  children: ReactNode;
}

export default async function RepoLayout({ params, children }: Props) {
  const token = await getSessionToken();
  const ctx = token ? await loadRepoContext(token, params.owner, params.name) : null;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <RepoTabs owner={params.owner} name={params.name} repoId={ctx?.repo.id} />
      <div className="flex min-h-0 flex-1 flex-col pt-3">{children}</div>
    </div>
  );
}
