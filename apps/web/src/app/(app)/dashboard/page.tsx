import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { DashboardSummaryDto } from '@archlens/shared-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardView } from '@/components/dashboard/dashboard-view';
import { ApiError } from '@/lib/api/client';
import { getDashboardSummaryServer } from '@/lib/api/dashboard';
import { getSessionToken } from '@/lib/auth/server';

export default async function DashboardPage() {
  const token = await getSessionToken();
  if (!token) redirect('/login');

  let summary: DashboardSummaryDto;
  try {
    summary = await getDashboardSummaryServer(token);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) redirect('/login?reauth=1');
    return (
      <div data-testid="dashboard" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Card data-testid="dashboard-error">
          <CardHeader>
            <CardTitle>Could not load dashboard</CardTitle>
            <CardDescription>
              {e instanceof ApiError
                ? `API ${e.status}: ${e.statusText}`
                : e instanceof Error
                  ? e.message
                  : 'Unknown error'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href="/projects">Back to Projects</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div data-testid="dashboard" className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <DashboardView summary={summary} />
    </div>
  );
}
