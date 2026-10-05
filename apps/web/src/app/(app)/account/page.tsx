import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AccountThemeControl } from '@/components/account/account-theme-control';
import { CopyableId } from '@/components/account/copyable-id';
import { ApiError } from '@/lib/api/client';
import { getMeServer } from '@/lib/api/users';
import { getSessionToken } from '@/lib/auth/server';

export default async function AccountPage() {
  const token = await getSessionToken();
  if (!token) redirect('/login');

  let user;
  try {
    user = await getMeServer(token);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect('/login?reauth=1');
    throw e;
  }

  const displayName = user.name ?? user.githubUsername ?? 'Unnamed user';
  const githubHref = user.githubUsername ? `https://github.com/${user.githubUsername}` : null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4" data-testid="account-page">
      <Card id="profile">
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={`${displayName} profile`}
              className="h-14 w-14 shrink-0 rounded-full border border-border object-cover"
            />
          ) : (
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-lg font-semibold text-foreground"
              aria-hidden="true"
            >
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <CardTitle className="truncate">{displayName}</CardTitle>
            <CardDescription className="truncate">
              {githubHref ? (
                <a
                  href={githubHref}
                  target="_blank"
                  rel="noreferrer"
                  className="text-body text-muted-foreground transition-colors hover:text-foreground"
                >
                  @{user.githubUsername}
                </a>
              ) : (
                'GitHub username not available'
              )}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 border-t border-border pt-4 sm:grid-cols-[10rem_1fr] sm:gap-y-4">
            <dt className="text-metadata font-medium text-muted-foreground">Email</dt>
            <dd className="mb-3 text-body text-foreground sm:mb-0">
              {user.email ?? 'Email not provided by GitHub'}
            </dd>
            <dt className="text-metadata font-medium text-muted-foreground">Connected since</dt>
            <dd className="mb-3 text-body text-foreground sm:mb-0" suppressHydrationWarning>
              {new Date(user.createdAt).toLocaleDateString()}
            </dd>
            <dt className="text-metadata font-medium text-muted-foreground">User ID</dt>
            <dd className="sm:mb-0">
              <CopyableId value={user.id} />
            </dd>
          </dl>
        </CardContent>
      </Card>

      <Card id="settings">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Applies to this browser. New sessions default to dark.</CardDescription>
        </CardHeader>
        <CardContent>
          <AccountThemeControl />
        </CardContent>
      </Card>
    </div>
  );
}
