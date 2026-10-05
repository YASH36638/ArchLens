import type { RepositoryMetaDto } from '@archlens/shared-types';
import { apiFetch, serverApiFetch } from './client';

export function getRepositoryMeta(
  token: string | null,
  repoId: string
): Promise<RepositoryMetaDto> {
  return apiFetch<RepositoryMetaDto>(`/repositories/${repoId}/meta`, { token });
}

export function getRepositoryMetaServer(token: string, repoId: string): Promise<RepositoryMetaDto> {
  return serverApiFetch<RepositoryMetaDto>(`/repositories/${repoId}/meta`, { token });
}
