'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import type { RepositoryDto } from '@archlens/shared-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ApiError } from '@/lib/api/client';
import { deleteRepo, updateRepo } from '@/lib/api/repos';
import { useAuthToken } from '@/hooks/use-auth-token';

interface Props {
  repo: RepositoryDto;
}

export function EditRepoForm({ repo }: Props) {
  const token = useAuthToken();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [defaultBranch, setDefaultBranch] = useState(repo.defaultBranch);
  const [isPrivate, setIsPrivate] = useState(repo.private);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  const dirty = defaultBranch.trim() !== repo.defaultBranch || isPrivate !== repo.private;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) {
      setError('Not signed in');
      return;
    }
    const trimmed = defaultBranch.trim();
    if (!trimmed) {
      setError('Default branch cannot be empty.');
      return;
    }
    setError(null);
    setOkMessage(null);
    setSaving(true);
    try {
      await updateRepo(token, repo.id, { defaultBranch: trimmed, private: isPrivate });
      void queryClient.invalidateQueries();
      setOkMessage('Settings saved. Re-scan to pick up the new branch.');
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) setError('Session expired. Please sign in again.');
        else if (e.status === 404) setError('Repository not found.');
        else setError(`API ${e.status}: ${e.statusText}`);
      } else {
        setError(e instanceof Error ? e.message : 'Unknown error');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!token) {
      setError('Not signed in');
      return;
    }
    setError(null);
    setOkMessage(null);
    setDisconnecting(true);
    try {
      await deleteRepo(token, repo.id);
      void queryClient.invalidateQueries();
      router.push('/projects');
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) setError('Session expired. Please sign in again.');
        else if (e.status === 404) setError('Repository already removed.');
        else setError(`API ${e.status}: ${e.statusText}`);
      } else {
        setError(e instanceof Error ? e.message : 'Unknown error');
      }
      setDisconnecting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div className="space-y-6" data-testid="edit-repo-form">
      <Card>
        <CardHeader>
          <CardTitle>Repository settings</CardTitle>
          <CardDescription>
            Change which branch Archlens analyzes and whether the repository is treated as private.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-metadata font-medium text-foreground">Default branch</span>
                <input
                  data-testid="edit-default-branch"
                  value={defaultBranch}
                  onChange={(e) => setDefaultBranch(e.target.value)}
                  placeholder="main"
                  required
                  disabled={saving || disconnecting}
                  className="min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-body text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                />
                <span className="block text-metadata text-muted-foreground">
                  Currently {repo.defaultBranch}. Match this to the repo&apos;s real default branch
                  (often <code>main</code> or <code>master</code>) — the scanner clones this ref.
                </span>
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 self-end rounded-lg px-1 text-body text-foreground">
                <input
                  data-testid="edit-private"
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  disabled={saving || disconnecting}
                  className="h-5 w-5 rounded border-input accent-primary"
                />
                <span>Private repository</span>
              </label>
            </div>

            {error && (
              <div
                className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-body text-destructive"
                data-testid="edit-error"
              >
                {error}
              </div>
            )}
            {okMessage && (
              <div
                className="rounded-lg border border-success/40 bg-success/10 px-3 py-2.5 text-body text-foreground"
                data-testid="edit-success"
              >
                {okMessage}
              </div>
            )}

            <div className="flex justify-end border-t border-border pt-4">
              <Button type="submit" disabled={saving || !dirty} data-testid="edit-submit">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save changes'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Disconnecting removes this repository from Archlens along with every scan, report, and
            fix suggestion. The source repo on GitHub is not affected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
            disabled={disconnecting}
            data-testid="disconnect-repo"
          >
            Disconnect repository
          </Button>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect {repo.fullName}?</DialogTitle>
            <DialogDescription>
              This deletes all scans and reports for this repository. You can re-connect it later.
              The source repo on GitHub is not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={disconnecting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDisconnect()}
              disabled={disconnecting}
            >
              {disconnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disconnecting…
                </>
              ) : (
                'Disconnect'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
