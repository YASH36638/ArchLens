'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Menu } from 'lucide-react';
import type { UserDto } from '@archlens/shared-types';
import { KellyShell } from '@/components/kelly/kelly-shell';
import { CommandPaletteProvider } from '@/components/layout/command-palette';
import { Sidebar } from '@/components/layout/sidebar';
import { KellyProvider } from '@/providers/kelly-provider';

export function AppShell({ user, children }: { user: UserDto | null; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // Expanded by default; only collapse when the user previously chose that.
    setCollapsed(window.localStorage.getItem('archlens-sidebar-collapsed') === 'true');
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem('archlens-sidebar-collapsed', String(next));
      return next;
    });
  };

  return (
    <KellyProvider>
      <CommandPaletteProvider>
        <a
          href="#main-content"
          className="fixed left-4 top-3 z-[100] -translate-y-24 rounded-md bg-primary px-4 py-2 text-button font-semibold text-primary-foreground shadow-md transition-transform focus:translate-y-0 focus-visible:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Skip to content
        </a>
        <div className="flex h-screen overflow-hidden">
          <Sidebar
            user={user}
            collapsed={collapsed}
            onToggle={toggleCollapsed}
            className="hidden h-full lg:flex"
          />

          {mobileOpen ? (
            <div className="fixed inset-0 z-50 lg:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-[hsl(217_59%_8%/0.4)] backdrop-blur-[1px]"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
              />
              <Sidebar
                mobile
                user={user}
                onNavigate={() => setMobileOpen(false)}
                className="relative h-full w-60 max-w-[85vw]"
              />
            </div>
          ) : null}

          <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2 lg:hidden">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Open navigation"
                data-testid="mobile-nav-toggle"
              >
                <Menu className="h-5 w-5" />
              </button>
              <span className="font-brand text-lg font-extrabold italic tracking-[-0.04em]">
                <span className="text-primary">Arch</span>
                <span className="text-foreground">lens</span>
              </span>
            </div>
            <main
              id="main-content"
              className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3 pb-24 sm:px-6"
            >
              {children}
            </main>
          </div>
          <KellyShell />
        </div>
      </CommandPaletteProvider>
    </KellyProvider>
  );
}
