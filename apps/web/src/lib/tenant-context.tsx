'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { TenantEnvironment } from '@tms/types';
import { createApiClient, type ApiClient } from './api/client';

const TENANT_ID =
  process.env.NEXT_PUBLIC_TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

interface TenantContextValue {
  tenantId: string;
  environment: TenantEnvironment;
  setEnvironment: (env: TenantEnvironment) => void;
  api: ApiClient;
}

const TenantCtx = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [environment, setEnvironmentState] = useState<TenantEnvironment>(
    TenantEnvironment.PROD,
  );

  const setEnvironment = useCallback((env: TenantEnvironment) => {
    setEnvironmentState(env);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tms-environment', env);
    }
  }, []);

  const api = useMemo(
    () =>
      createApiClient({
        baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1',
        tenantId: TENANT_ID,
        environment,
      }),
    [environment],
  );

  const value = useMemo(
    () => ({ tenantId: TENANT_ID, environment, setEnvironment, api }),
    [environment, setEnvironment, api],
  );

  return <TenantCtx.Provider value={value}>{children}</TenantCtx.Provider>;
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantCtx);
  if (!ctx) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return ctx;
}
