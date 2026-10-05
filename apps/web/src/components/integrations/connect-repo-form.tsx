'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError } from '@/lib/api/client';
import { createRepo } from '@/lib/api/repos';
import { useAuthToken } from '@/hooks/use-auth-token';

export function ConnectRepoForm() {
  const token = useAuthToken();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [owner, setOwner] = useState('');
  const [name, setName] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) {
      setError('Not signed in');
      return;
    }
    setError(null);
    setOkMessage(null);
    setSubmitting(true);
    try {
      const repo = await createRepo(token, {
        owner: owner.trim(),
        name: name.trim(),
        defaultBranch: defaultBranch.trim() || 'main',
        private: isPrivate,
      });
      void queryClient.invalidateQueries();
      setOkMessage(`Connected ${repo.fullName}`);
      router.refresh();
      // Navigate after a brief moment so the user sees the confirmation.
      setTimeout(() => router.push(`/repos/${repo.owner}/${repo.name}`), 600);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 409) setError('This repository is already connected.');
        else if (e.status === 401) setError('Session expired. Please sign in again.');
        else setError(`API ${e.status}: ${e.statusText}`);
      } else {
        setError(e instanceof Error ? e.message : 'Unknown error');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card data-testid="connect-repo-form">
      <CardHeader>
        <CardTitle>Connect a repository</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5" aria-busy={submitting}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-metadata font-medium text-foreground">Owner</span>
              <input
                data-testid="connect-owner"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="octocat"
                required
                disabled={submitting}
                className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-body text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-metadata font-medium text-foreground">Repository name</span>
              <input
                data-testid="connect-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="hello-world"
                required
                disabled={submitting}
                className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-body text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-metadata font-medium text-foreground">Default branch</span>
              <input
                value={defaultBranch}
                onChange={(e) => setDefaultBranch(e.target.value)}
                placeholder="main"
                disabled={submitting}
                className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-body text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 self-end rounded-lg px-1 text-body text-foreground">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                disabled={submitting}
                className="h-5 w-5 rounded border-input accent-primary"
              />
              <span>Private repository</span>
            </label>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-body text-destructive"
              data-testid="connect-error"
            >
              {error}
            </div>
          )}
          {okMessage && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-lg border border-grade-a/40 bg-grade-a/10 px-3 py-2.5 text-body text-foreground"
              data-testid="connect-success"
            >
              {okMessage}
            </div>
          )}

          <div className="flex justify-end border-t border-border pt-4">
            <Button
              type="submit"
              disabled={submitting}
              data-testid="connect-submit"
              className="w-full sm:w-auto"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Connecting…
                </>
              ) : (
                'Connect repository'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
