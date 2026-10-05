import type { DashboardSummaryDto } from '@archlens/shared-types';
import { apiFetch, serverApiFetch } from './client';

export function getDashboardSummary(token: string | null): Promise<DashboardSummaryDto> {
  return apiFetch<DashboardSummaryDto>('/dashboard/summary', { token });
}

export function getDashboardSummaryServer(token: string): Promise<DashboardSummaryDto> {
  return serverApiFetch<DashboardSummaryDto>('/dashboard/summary', { token });
}
