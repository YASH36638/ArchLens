export type RepoProvider = 'github';

export interface RepositoryDto {
  id: string;
  provider: RepoProvider;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  private: boolean;
  htmlUrl: string;
  connectedAt: string;
}

export interface CreateRepositoryRequestDto {
  provider?: RepoProvider;
  owner: string;
  name: string;
  defaultBranch?: string;
  private?: boolean;
  htmlUrl?: string;
}

export interface UpdateRepositoryRequestDto {
  defaultBranch?: string;
  private?: boolean;
}

export interface RepoLanguageShareDto {
  name: string;
  bytes: number;
  percent: number;
  color: string;
}

export interface RepoPersonDto {
  login: string;
  avatarUrl?: string;
  htmlUrl?: string;
  contributions?: number;
}

export interface RepositoryMetaDto {
  branches: string[];
  languages: RepoLanguageShareDto[];
  collaborators: RepoPersonDto[];
  contributors: RepoPersonDto[];
  reportsTo: { login: string; note: string } | null;
  lastCommit?: {
    sha: string;
    message: string;
    authorLogin?: string;
    authoredAt?: string;
    htmlUrl?: string;
  };
}
