'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { RescanButton } from '@/components/scan/rescan-button';

interface RepoTabsProps {
  owner: string;
  name: string;
  repoId?: string | null;
}

const tabs: ReadonlyArray<{ slug: string; label: string }> = [
  { slug: '', label: 'Overview' },
  { slug: 'architecture', label: 'Architecture' },
  { slug: 'hotspots', label: 'Hotspots' },
  { slug: 'settings', label: 'Settings' },
];

export function RepoTabs({ owner, name, repoId }: RepoTabsProps) {
  const pathname = usePathname();
  const base = `/repos/${owner}/${name}`;

  return (
    <nav
      className="sticky top-0 z-20 -mx-4 border-b border-border bg-background/80 px-4 backdrop-blur-sm sm:-mx-6 sm:px-6"
      data-testid="repo-tabs"
      aria-label="Repository sections"
    >
      <div className="flex min-h-12 items-center gap-2 sm:gap-4">
        <div className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ul className="flex w-max min-w-full items-center gap-1">
            {tabs.map((t) => {
              const href = t.slug ? `${base}/${t.slug}` : base;
              const active = pathname === href || (t.slug && pathname.startsWith(`${href}/`));
              return (
                <li key={t.slug || 'overview'}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative inline-flex min-h-11 items-center whitespace-nowrap px-3 text-navigation transition-colors duration-150 ease-out',
                      active
                        ? 'font-semibold text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {t.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        {repoId ? (
          <div className="shrink-0">
            <RescanButton repoId={repoId} />
          </div>
        ) : null}
      </div>
    </nav>
  );
}
