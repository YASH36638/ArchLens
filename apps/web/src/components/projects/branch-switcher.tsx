'use client';

import { useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useAuthToken } from '@/hooks/use-auth-token';
import { createScan } from '@/lib/api/scans';
import { useRepoMeta } from '@/hooks/use-repo-meta';
import { cn } from '@/lib/utils/cn';
import { Popover } from '@/components/ui/popover';

interface BranchSwitcherProps {
  repoId: string;
  defaultBranch: string;
}

export function BranchSwitcher({ repoId, defaultBranch }: BranchSwitcherProps) {
  const token = useAuthToken();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(defaultBranch);
  const [switching, setSwitching] = useState(false);
  const { meta, loading, error } = useRepoMeta(repoId, open);

  async function selectBranch(branch: string) {
    if (!token || branch === current) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    try {
      setCurrent(branch);
      await createScan(token, repoId, branch);
      setOpen(false);
    } catch {
      setCurrent(defaultBranch);
    } finally {
      setSwitching(false);
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      contentLabel="Select repository branch"
      className="w-56 p-2"
      trigger={
        <button
          type="button"
          className="inline-flex h-6 max-w-full items-center gap-1 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2 text-[11px] font-medium leading-none text-[#64748B] shadow-none transition-colors duration-150 ease-out hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]/25"
          aria-label={`Change branch. Current branch: ${current}`}
        >
          <span className="truncate">{current}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />
        </button>
      }
    >
      <p className="px-2 pb-2 text-sm font-semibold text-foreground">Select branch</p>
      {loading || switching ? (
        <div
          className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground"
          role="status"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {switching ? 'Starting scan…' : 'Loading branches…'}
        </div>
      ) : error ? (
        <p className="px-2 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : (
        <ul className="max-h-56 overflow-y-auto" aria-label="Repository branches">
          {(meta?.branches?.length ? meta.branches : [defaultBranch]).map((branch) => (
            <li key={branch}>
              <button
                type="button"
                className={cn(
                  'w-full rounded-md px-2 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  branch === current && 'bg-muted font-semibold'
                )}
                onClick={() => void selectBranch(branch)}
                aria-current={branch === current ? 'true' : undefined}
              >
                {branch}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Popover>
  );
}
