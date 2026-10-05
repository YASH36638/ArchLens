'use client';

import { useCallback, useEffect, useState } from 'react';
import type { RepositoryMetaDto } from '@archlens/shared-types';
import { useAuthToken } from '@/hooks/use-auth-token';
import { getRepositoryMeta } from '@/lib/api/repo-meta';

const metaCache = new Map<string, RepositoryMetaDto>();

export function useRepoMeta(repoId: string, enabled: boolean) {
  const token = useAuthToken();
  const [meta, setMeta] = useState<RepositoryMetaDto | null>(() => metaCache.get(repoId) ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !enabled) return;
    if (metaCache.has(repoId)) {
      setMeta(metaCache.get(repoId)!);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getRepositoryMeta(token, repoId);
      metaCache.set(repoId, data);
      setMeta(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load GitHub meta');
    } finally {
      setLoading(false);
    }
  }, [enabled, repoId, token]);

  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  return { meta, loading, error, reload: load };
}
