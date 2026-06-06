import { TenantEnvironment } from '@tms/types';

export interface ApiClientConfig {
  baseUrl: string;
  tenantId: string;
  environment?: TenantEnvironment;
  accessToken?: string;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string;
  error: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly error: string;
  readonly details?: unknown;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiError';
    this.statusCode = body.statusCode;
    this.error = body.error;
    this.details = body.details;
  }
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface FetchOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

function buildUrl(baseUrl: string, path: string, params?: FetchOptions['params']): string {
  const url = new URL(path.startsWith('http') ? path : `${baseUrl}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

export function createApiClient(config: ApiClientConfig) {
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Tenant-Id': config.tenantId,
  };

  if (config.environment) {
    defaultHeaders['X-Tenant-Environment'] = config.environment;
  }

  if (config.accessToken) {
    defaultHeaders.Authorization = `Bearer ${config.accessToken}`;
  }

  async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
    const { params, body, headers, ...rest } = options;
    const url = buildUrl(config.baseUrl, path, params);

    const response = await fetch(url, {
      ...rest,
      headers: {
        ...defaultHeaders,
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let errorBody: ApiErrorBody;
      try {
        errorBody = (await response.json()) as ApiErrorBody;
      } catch {
        errorBody = {
          statusCode: response.status,
          message: response.statusText || 'Request failed',
          error: 'RequestError',
        };
      }
      throw new ApiError(errorBody);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  return {
    get: <T>(path: string, options?: Omit<FetchOptions, 'method' | 'body'>) =>
      request<T>(path, { ...options, method: 'GET' }),
    post: <T>(path: string, body?: unknown, options?: Omit<FetchOptions, 'method' | 'body'>) =>
      request<T>(path, { ...options, method: 'POST', body }),
    put: <T>(path: string, body?: unknown, options?: Omit<FetchOptions, 'method' | 'body'>) =>
      request<T>(path, { ...options, method: 'PUT', body }),
    patch: <T>(path: string, body?: unknown, options?: Omit<FetchOptions, 'method' | 'body'>) =>
      request<T>(path, { ...options, method: 'PATCH', body }),
    delete: <T>(path: string, options?: Omit<FetchOptions, 'method' | 'body'>) =>
      request<T>(path, { ...options, method: 'DELETE' }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

const defaultConfig: ApiClientConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1',
  tenantId: process.env.NEXT_PUBLIC_TENANT_ID ?? '00000000-0000-0000-0000-000000000001',
  environment: TenantEnvironment.PROD,
};

export const apiClient = createApiClient(defaultConfig);
