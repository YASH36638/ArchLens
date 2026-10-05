'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  FolderKanban,
  LayoutDashboard,
  MessageCircle,
  Plug,
  Search,
  Settings,
  UserRound,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils/cn';
import { useKelly } from '@/providers/kelly-provider';

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  href?: string;
  action?: 'kelly';
  keywords?: string[];
  group: string;
}

interface CommandPaletteContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error('CommandPaletteTrigger must be used within CommandPaletteProvider');
  return ctx;
}

function repoFromPath(pathname: string): { owner: string; name: string } | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'repos' || !parts[1] || !parts[2]) return null;
  return { owner: parts[1], name: parts[2] };
}

function buildCommands(pathname: string): CommandItem[] {
  const repo = repoFromPath(pathname);
  const base: CommandItem[] = [
    {
      id: 'projects',
      label: 'Projects',
      hint: 'Portfolio',
      href: '/projects',
      keywords: ['repos', 'repositories', 'list'],
      group: 'Navigate',
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      hint: 'Portfolio health',
      href: '/dashboard',
      keywords: ['insights', 'trend', 'kpis'],
      group: 'Navigate',
    },
    {
      id: 'glossary',
      label: 'Glossary',
      hint: 'Metrics and smells',
      href: '/glossary',
      keywords: ['metrics', 'smells', 'definitions'],
      group: 'Navigate',
    },
    {
      id: 'integrations',
      label: 'Integrations',
      hint: 'Connect repositories',
      href: '/integrations',
      keywords: ['github', 'connect'],
      group: 'Navigate',
    },
    {
      id: 'account',
      label: 'Account',
      hint: 'Profile and settings',
      href: '/account',
      keywords: ['profile', 'user'],
      group: 'Navigate',
    },
    {
      id: 'kelly',
      label: 'Ask Kelly',
      hint: 'Quality assistant',
      action: 'kelly',
      keywords: ['ai', 'help', 'chat'],
      group: 'Assistant',
    },
  ];

  if (!repo) return base;

  const root = `/repos/${repo.owner}/${repo.name}`;
  return [
    ...base,
    {
      id: 'repo-overview',
      label: 'Overview',
      href: root,
      keywords: ['repo', 'score'],
      group: repo.name,
    },
    {
      id: 'repo-architecture',
      label: 'Architecture',
      href: `${root}/architecture`,
      keywords: ['graph', 'modules', 'workbench'],
      group: repo.name,
    },
    {
      id: 'repo-hotspots',
      label: 'Hotspots',
      href: `${root}/hotspots`,
      keywords: ['churn', 'complexity'],
      group: repo.name,
    },
    {
      id: 'repo-settings',
      label: 'Settings',
      href: `${root}/settings`,
      keywords: ['disconnect', 'branch'],
      group: repo.name,
    },
  ];
}

function matchesQuery(item: CommandItem, query: string): boolean {
  if (!query) return true;
  const haystack = [item.label, item.hint, item.group, ...(item.keywords ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const value = useMemo(() => ({ open, setOpen }), [open]);

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPaletteDialog />
    </CommandPaletteContext.Provider>
  );
}

export function CommandPaletteTrigger({ className }: { className?: string }) {
  const { setOpen } = useCommandPalette();
  const [shortcut, setShortcut] = useState('Ctrl+K');

  useEffect(() => {
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
    setShortcut(isMac ? '⌘K' : 'Ctrl+K');
  }, []);

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        'flex h-11 min-h-11 w-full max-w-xl items-center gap-2 rounded-md border border-border bg-background/80 px-3 text-left text-metadata text-muted-foreground shadow-2xs transition-colors duration-[120ms] ease-out hover:border-primary/30 hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
      data-testid="command-palette-trigger"
      aria-label="Open command palette"
    >
      <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">Search or jump to…</span>
      <kbd className="pointer-events-none hidden rounded-md border border-border bg-muted/80 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground md:inline">
        {shortcut}
      </kbd>
    </button>
  );
}

function CommandPaletteDialog() {
  const { open, setOpen } = useCommandPalette();
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const kelly = useKelly();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  const commands = useMemo(() => buildCommands(pathname), [pathname]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return commands.filter((item) => matchesQuery(item, q));
  }, [commands, query]);

  const grouped = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, CommandItem[]>();
    for (const item of filtered) {
      if (!map.has(item.group)) {
        map.set(item.group, []);
        order.push(item.group);
      }
      map.get(item.group)!.push(item);
    }
    return order.map((group) => ({ group, items: map.get(group)! }));
  }, [filtered]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, filtered]);

  const run = useCallback(
    (item: CommandItem) => {
      setOpen(false);
      if (item.action === 'kelly') {
        kelly.openModal();
        return;
      }
      if (item.href) router.push(item.href);
    },
    [kelly, router, setOpen]
  );

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!filtered.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % filtered.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + filtered.length) % filtered.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = filtered[activeIndex];
      if (item) run(item);
    }
  };

  let runningIndex = -1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        hideClose
        overlayClassName="z-[70]"
        data-testid="command-palette"
        aria-describedby="command-palette-description"
        className="top-[min(20vh,7rem)] z-[80] w-[calc(100%-1.5rem)] max-w-xl translate-y-0 gap-0 overflow-hidden p-0 sm:rounded-2xl"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription id="command-palette-description" className="sr-only">
          Jump to a page, repository tab, or Ask Kelly. Type to filter.
        </DialogDescription>
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages, tabs, Kelly…"
            className="h-12 w-full bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground"
            aria-label="Filter commands"
            autoComplete="off"
          />
        </div>
        <div
          className="max-h-[min(22rem,50vh)] overflow-y-auto p-1.5"
          role="listbox"
          aria-label="Commands"
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-body text-muted-foreground">
              No matching commands
            </p>
          ) : (
            grouped.map(({ group, items }) => (
              <div key={group} className="mb-1.5 last:mb-0">
                <p className="px-2.5 py-1.5 text-metadata font-medium uppercase tracking-wide text-muted-foreground">
                  {group}
                </p>
                {items.map((item) => {
                  runningIndex += 1;
                  const index = runningIndex;
                  const active = index === activeIndex;
                  const Icon = iconFor(item);
                  return (
                    <button
                      key={item.id}
                      ref={active ? activeRef : undefined}
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={cn(
                        'flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-button outline-none transition-colors duration-[120ms]',
                        active ? 'bg-primary/10 text-foreground' : 'text-foreground hover:bg-muted'
                      )}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => run(item)}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.hint ? (
                        <span className="hidden truncate text-metadata text-muted-foreground sm:inline">
                          {item.hint}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function iconFor(item: CommandItem) {
  switch (item.id) {
    case 'projects':
      return FolderKanban;
    case 'dashboard':
      return LayoutDashboard;
    case 'glossary':
      return BookOpen;
    case 'integrations':
      return Plug;
    case 'account':
      return UserRound;
    case 'kelly':
      return MessageCircle;
    case 'repo-settings':
      return Settings;
    default:
      return Search;
  }
}
