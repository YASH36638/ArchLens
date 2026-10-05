import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type {
  RepositoryMetaDto,
  RepoLanguageShareDto,
  RepoPersonDto,
} from '@archlens/shared-types';
import { PrismaService } from '../../database/prisma.service';

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Java: '#b07219',
  Go: '#00ADD8',
  Rust: '#dea584',
  Ruby: '#701516',
  PHP: '#4F5D95',
  CSS: '#563d7c',
  HTML: '#e34c26',
  Shell: '#89e051',
  C: '#555555',
  'C++': '#f34b7d',
  'C#': '#178600',
};

@Injectable()
export class GithubMetaService {
  private readonly logger = new Logger(GithubMetaService.name);
  private readonly cache = new Map<string, { expires: number; value: RepositoryMetaDto }>();

  constructor(private readonly prisma: PrismaService) {}

  async getMeta(userId: string, repoId: string): Promise<RepositoryMetaDto> {
    const cached = this.cache.get(`${userId}:${repoId}`);
    if (cached && cached.expires > Date.now()) return cached.value;

    const repo = await this.prisma.repository.findFirst({ where: { id: repoId, userId } });
    if (!repo) throw new NotFoundException('Repository not found');

    const account = await this.prisma.account.findFirst({
      where: { userId, provider: 'github' },
      select: { accessToken: true },
    });
    if (!account?.accessToken) {
      throw new ServiceUnavailableException(
        'GitHub token not available. Sign out and sign in again with GitHub.'
      );
    }

    const headers = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${account.accessToken}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Archlens',
    };

    const base = `https://api.github.com/repos/${repo.owner}/${repo.name}`;

    const [branchesRes, langsRes, collabRes, contribRes, commitsRes] = await Promise.all([
      fetch(`${base}/branches?per_page=100`, { headers }),
      fetch(`${base}/languages`, { headers }),
      fetch(`${base}/collaborators?per_page=50`, { headers }),
      fetch(`${base}/contributors?per_page=50`, { headers }),
      fetch(`${base}/commits?per_page=1`, { headers }),
    ]);

    if (branchesRes.status === 401 || langsRes.status === 401) {
      throw new ServiceUnavailableException('GitHub token rejected. Re-authenticate with GitHub.');
    }

    const branchesJson = branchesRes.ok
      ? ((await branchesRes.json()) as Array<{ name: string }>)
      : [];
    const langsJson = langsRes.ok ? ((await langsRes.json()) as Record<string, number>) : {};
    const collabJson = collabRes.ok
      ? ((await collabRes.json()) as Array<{
          login: string;
          avatar_url?: string;
          html_url?: string;
        }>)
      : [];
    const contribJson = contribRes.ok
      ? ((await contribRes.json()) as Array<{
          login: string;
          avatar_url?: string;
          html_url?: string;
          contributions?: number;
        }>)
      : [];
    const commitsJson = commitsRes.ok
      ? ((await commitsRes.json()) as Array<{
          sha: string;
          html_url?: string;
          commit?: { message?: string; author?: { date?: string; name?: string } };
          author?: { login?: string };
        }>)
      : [];

    if (!branchesRes.ok) {
      this.logger.warn(`GitHub branches ${branchesRes.status} for ${repo.fullName}`);
    }

    const totalBytes = Object.values(langsJson).reduce((a, b) => a + b, 0) || 1;
    const languages: RepoLanguageShareDto[] = Object.entries(langsJson)
      .map(([name, bytes]) => ({
        name,
        bytes,
        percent: Math.round((bytes / totalBytes) * 1000) / 10,
        color: LANGUAGE_COLORS[name] ?? '#8b949e',
      }))
      .sort((a, b) => b.bytes - a.bytes);

    const collaborators: RepoPersonDto[] = collabJson.map((c) => ({
      login: c.login,
      avatarUrl: c.avatar_url,
      htmlUrl: c.html_url,
    }));

    const contributors: RepoPersonDto[] = contribJson.map((c) => ({
      login: c.login,
      avatarUrl: c.avatar_url,
      htmlUrl: c.html_url,
      contributions: c.contributions,
    }));

    const head = commitsJson[0];
    const meta: RepositoryMetaDto = {
      branches: branchesJson.map((b) => b.name),
      languages,
      collaborators,
      contributors,
      reportsTo: null,
      lastCommit: head
        ? {
            sha: head.sha,
            message: head.commit?.message?.split('\n')[0] ?? '',
            authorLogin: head.author?.login ?? head.commit?.author?.name,
            authoredAt: head.commit?.author?.date,
            htmlUrl: head.html_url,
          }
        : undefined,
    };

    this.cache.set(`${userId}:${repoId}`, { expires: Date.now() + 60_000, value: meta });
    return meta;
  }
}
