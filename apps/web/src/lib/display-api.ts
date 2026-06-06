import type { DisplayBoard } from '@tms/types';
import { createApiClient } from './api/client';
import { readSelectedTenantId } from './tenant-selection';

export async function fetchDisplayBoard(tenantId?: string): Promise<DisplayBoard> {
  const resolvedTenantId = tenantId ?? readSelectedTenantId();
  const client = createApiClient({
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1',
    tenantId: resolvedTenantId,
  });
  return client.get<DisplayBoard>('/frontdesk/display-board');
}
