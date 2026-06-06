import type { DisplayBoard } from '@tms/types';
import { createApiClient } from './api/client';

const TENANT_ID =
  process.env.NEXT_PUBLIC_TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

export async function fetchDisplayBoard(): Promise<DisplayBoard> {
  const client = createApiClient({
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1',
    tenantId: TENANT_ID,
  });
  return client.get<DisplayBoard>('/frontdesk/display-board');
}
