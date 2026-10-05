import type { ReactNode } from 'react';
import type { UserDto } from '@archlens/shared-types';
import { AppShell } from '@/components/layout/app-shell';
import { ApiError } from '@/lib/api/client';
import { getMeServer } from '@/lib/api/users';
import { getSessionToken } from '@/lib/auth/server';

async function loadUser(): Promise<UserDto | null> {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    return await getMeServer(token);
  } catch (e) {
    if (e instanceof ApiError) return null;
    return null;
  }
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await loadUser();
  return <AppShell user={user}>{children}</AppShell>;
}
