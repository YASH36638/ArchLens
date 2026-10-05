'use client';

import { signOut } from 'next-auth/react';
import { ChevronUp, CircleHelp, LogOut, Moon, Settings, UserRound } from 'lucide-react';
import type { UserDto } from '@archlens/shared-types';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/providers/theme-provider';
import { useKelly } from '@/providers/kelly-provider';
import { cn } from '@/lib/utils/cn';

interface AccountMenuProps {
  user: UserDto | null;
  collapsed?: boolean;
  floating?: boolean;
  tone?: 'default' | 'navy';
  className?: string;
}

export function AccountMenu({
  user,
  collapsed = false,
  floating = false,
  tone = 'default',
  className,
}: AccountMenuProps) {
  const name = user?.name ?? user?.githubUsername ?? user?.email ?? 'Account';
  const identity = user?.githubUsername ? `@${user.githubUsername}` : (user?.email ?? 'Signed in');
  const { resolvedTheme, setTheme } = useTheme();
  const kelly = useKelly();
  const navy = tone === 'navy';

  return (
    <DropdownMenu
      align="start"
      className="bottom-full top-auto mb-2 mt-0"
      trigger={
        <button
          type="button"
          className={cn(
            floating
              ? className
              : cn(
                  'group/profile flex min-h-10 w-full items-center rounded-xl text-left transition-colors duration-150 ease-out',
                  collapsed ? 'justify-center px-0' : 'gap-2.5 px-2',
                  navy ? 'hover:bg-white/10' : 'hover:bg-muted/80'
                ),
            !floating && className
          )}
          data-testid="sidebar-account"
          title={collapsed || floating ? 'Account' : undefined}
          aria-label="Account menu"
        >
          {floating || collapsed ? (
            <UserRound className="h-5 w-5" aria-hidden="true" />
          ) : user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full border border-white/20 object-cover transition-all duration-150 ease-out group-hover/profile:ring-2 group-hover/profile:ring-sky-300/30"
            />
          ) : (
            <span
              className={cn(
                'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all duration-150 ease-out group-hover/profile:ring-2',
                navy
                  ? 'bg-white/15 text-sky-200 group-hover/profile:ring-sky-300/30'
                  : 'bg-primary/10 text-primary group-hover/profile:ring-primary/20'
              )}
            >
              {name.slice(0, 1).toUpperCase()}
            </span>
          )}
          {!collapsed && !floating ? (
            <>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block max-w-[9.5rem] truncate text-sm font-semibold',
                    navy ? 'text-white' : 'text-foreground'
                  )}
                >
                  {name}
                </span>
                <span
                  className={cn(
                    'block max-w-[9.5rem] truncate text-metadata',
                    navy ? 'text-slate-400' : 'text-muted-foreground'
                  )}
                >
                  {identity}
                </span>
              </span>
              <ChevronUp
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors duration-150 ease-out',
                  navy
                    ? 'text-slate-400 group-hover/profile:text-white'
                    : 'text-muted-foreground group-hover/profile:text-foreground'
                )}
              />
            </>
          ) : (
            <span className="sr-only">{name}</span>
          )}
        </button>
      }
    >
      <DropdownMenuLabel>
        <span className="block truncate font-semibold text-foreground">{name}</span>
        <span className="block truncate text-sm font-normal text-muted-foreground">{identity}</span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => {
          window.location.href = '/account#profile';
        }}
      >
        <UserRound className="h-4 w-4" /> Profile
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => {
          window.location.href = '/account#settings';
        }}
      >
        <Settings className="h-4 w-4" /> Account settings
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
        <Moon className="h-4 w-4" /> Preferences
        <span className="ml-auto text-metadata text-muted-foreground">
          {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
        </span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={kelly.openModal}>
        <CircleHelp className="h-4 w-4" /> Help
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className="text-destructive hover:bg-destructive/10 focus:bg-destructive/10"
        onClick={() => void signOut({ callbackUrl: '/' })}
      >
        <LogOut className="h-4 w-4" /> Sign out
      </DropdownMenuItem>
    </DropdownMenu>
  );
}
