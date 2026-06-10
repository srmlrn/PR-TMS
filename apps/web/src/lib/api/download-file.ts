import { TenantEnvironment } from '@tms/types';

export async function downloadApiFile(options: {
  path: string;
  filename: string;
  tenantId: string;
  accessToken?: string;
  environment?: TenantEnvironment;
}): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
  const url = options.path.startsWith('http') ? options.path : `${baseUrl}${options.path}`;

  const headers: Record<string, string> = {
    Accept: 'application/pdf',
    'X-Tenant-Id': options.tenantId,
  };

  if (options.environment) {
    headers['X-Tenant-Environment'] = options.environment;
  }

  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  const response = await fetch(url, { method: 'GET', headers });

  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = options.filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
