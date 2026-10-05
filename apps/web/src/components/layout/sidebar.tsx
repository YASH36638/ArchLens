'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Brain,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  Plug,
  X,
} from 'lucide-react';
import type { UserDto } from '@archlens/shared-types';
import { AccountMenu } from '@/components/layout/account-menu';
import { cn } from '@/lib/utils/cn';
import { useKelly } from '@/providers/kelly-provider';

const items: ReadonlyArray<{
  href?: string;
  label: string;
  icon: typeof LayoutDashboard;
  match?: (pathname: string) => boolean;
  action?: 'kelly';
}> = [
  {
    href: '/projects',
    label: 'Projects',
    icon: FolderKanban,
    match: (p) => p === '/projects' || p.startsWith('/repos/'),
  },
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    match: (p) => p === '/dashboard',
  },
  {
    href: '/glossary',
    label: 'Glossary',
    icon: BookOpen,
    match: (p) => p.startsWith('/glossary') || p.startsWith('/metrics') || p.startsWith('/smells'),
  },
  { label: 'Ask Kelly', icon: Brain, action: 'kelly' },
  {
    href: '/integrations',
    label: 'Integrations',
    icon: Plug,
    match: (p) => p.startsWith('/integrations'),
  },
];

/** Opaque navy for expanded sidebar. */
const sidebarOpaque =
  'border border-[hsl(217_45%_18%)] bg-[hsl(217_55%_12%)] text-slate-100 shadow-[0_12px_40px_rgba(8,17,31,0.35)]';

/** Transparent glass for collapsed floating rail. */
const sidebarGlass =
  'border border-white/10 bg-[hsl(217_55%_12%/0.55)] text-slate-100 shadow-[0_12px_40px_rgba(8,17,31,0.28)] backdrop-blur-2xl';

const floatBtn =
  'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-slate-100 shadow-[0_4px_16px_rgba(8,17,31,0.2)] backdrop-blur-md transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-sky-300/40 hover:bg-white/18 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/50';

const floatBtnActive =
  'border-sky-300/50 bg-sky-400/20 text-white shadow-[0_4px_18px_rgba(79,140,255,0.28)]';

const navItemBase =
  'group relative flex min-h-10 items-center gap-3 rounded-xl px-3 text-navigation transition-all duration-150 ease-out';

interface SidebarProps {
  className?: string;
  collapsed?: boolean;
  mobile?: boolean;
  user?: UserDto | null;
  onToggle?: () => void;
  onNavigate?: () => void;
}

export function Sidebar({
  className,
  collapsed = false,
  mobile = false,
  user = null,
  onToggle,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname() ?? '';
  const kelly = useKelly();
  const isFloating = collapsed && !mobile;

  if (isFloating) {
    return (
      <aside
        className={cn(
          'relative z-[60] flex h-full w-[4.5rem] shrink-0 flex-col items-center justify-center bg-transparent',
          'animate-in fade-in slide-in-from-left-3 duration-300',
          className
        )}
        data-testid="sidebar"
        data-collapsed="true"
      >
        <div
          className={cn(
            'flex flex-col items-center gap-2 rounded-2xl p-2 transition-all duration-300 ease-out',
            sidebarGlass
          )}
        >
          <nav className="flex flex-col items-center gap-2" aria-label="Primary navigation">
            {items.map((item, index) => {
              const Icon = item.icon;
              const active = item.match ? item.match(pathname) : false;
              const isActive = active || (item.action === 'kelly' && kelly.modalOpen);
              const stagger = cn(
                'animate-in fade-in zoom-in-95 duration-300 fill-mode-both',
                index === 0 && 'delay-75',
                index === 1 && 'delay-100',
                index === 2 && 'delay-150',
                index === 3 && 'delay-200',
                index === 4 && 'delay-300'
              );

              if (item.action === 'kelly') {
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      if (kelly.modalOpen) kelly.close();
                      else kelly.openModal();
                    }}
                    data-testid="nav-ask-kelly"
                    title={item.label}
                    aria-label={item.label}
                    className={cn(floatBtn, isActive && floatBtnActive, stagger)}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </button>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href!}
                  aria-current={active ? 'page' : undefined}
                  title={item.label}
                  aria-label={item.label}
                  className={cn(floatBtn, isActive && floatBtnActive, stagger)}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </Link>
              );
            })}
          </nav>

          <div className="my-1 h-px w-6 bg-white/20" aria-hidden="true" />

          <AccountMenu
            user={user}
            collapsed
            floating
            tone="navy"
            className={cn(floatBtn, 'animate-in fade-in zoom-in-95 delay-300 duration-300')}
          />

          {onToggle ? (
            <button
              type="button"
              onClick={onToggle}
              className={cn(floatBtn, 'animate-in fade-in zoom-in-95 delay-300 duration-300')}
              aria-label="Expand navigation"
              title="Expand sidebar"
              data-testid="sidebar-collapse-toggle"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        'relative z-[60] flex w-60 shrink-0 flex-col overflow-hidden rounded-2xl',
        sidebarOpaque,
        'animate-in fade-in slide-in-from-left-2 duration-300',
        className,
        !mobile && 'm-2 h-[calc(100%-1rem)]'
      )}
      data-testid="sidebar"
      data-collapsed="false"
    >
      <div className="relative shrink-0 border-b border-white/10 px-3 py-5">
        <Link
          href="/projects"
          onClick={onNavigate}
          className={cn(
            'flex min-h-14 w-full items-center justify-center rounded-xl px-2 py-2 transition-colors duration-150 ease-out hover:bg-white/10',
            mobile && 'pr-8'
          )}
          aria-label="Archlens home"
        >
          <span className="font-brand text-center text-[1.75rem] font-extrabold italic leading-none tracking-[-0.04em]">
            <span className="text-sky-300">Arch</span>
            <span className="text-white">lens</span>
          </span>
          <span className="sr-only">Archlens</span>
        </Link>
        {mobile ? (
          <button
            type="button"
            onClick={onNavigate}
            className="absolute right-1 top-1 inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-300 transition-colors duration-150 ease-out hover:bg-white/10 hover:text-white"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-2" aria-label="Primary navigation">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.match ? item.match(pathname) : false;
          const isActive = active || (item.action === 'kelly' && kelly.modalOpen);
          const classes = cn(
            navItemBase,
            isActive
              ? 'bg-white/15 font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
              : 'font-medium text-slate-300 hover:bg-white/10 hover:text-white'
          );

          const indicator = (
            <span
              className={cn(
                'absolute left-0 top-1/2 w-[3px] -translate-y-1/2 rounded-full bg-sky-300 transition-all duration-200 ease-out',
                isActive ? 'h-5 opacity-100' : 'h-0 opacity-0'
              )}
              aria-hidden="true"
            />
          );

          const iconEl = (
            <Icon
              className={cn(
                'h-5 w-5 shrink-0 transition-colors duration-150 ease-out',
                isActive ? 'text-sky-300' : 'text-slate-400 group-hover:text-slate-100'
              )}
            />
          );

          if (item.action === 'kelly') {
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  if (kelly.modalOpen) kelly.close();
                  else kelly.openModal();
                  onNavigate?.();
                }}
                data-testid="nav-ask-kelly"
                className={classes}
              >
                {indicator}
                {iconEl}
                {item.label}
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href!}
              aria-current={active ? 'page' : undefined}
              onClick={onNavigate}
              className={classes}
            >
              {indicator}
              {iconEl}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/10 p-2">
        {!mobile && onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            className="mb-1 flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-navigation font-medium text-slate-300 transition-colors duration-150 ease-out hover:bg-white/10 hover:text-white"
            aria-label="Collapse navigation"
            data-testid="sidebar-collapse-toggle"
          >
            <ChevronLeft className="h-5 w-5" />
            Collapse
          </button>
        ) : null}
        <AccountMenu user={user} tone="navy" />
      </div>
    </aside>
  );
}
