'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { TenantEnvironment } from '@tms/types';
import { useAuth } from './auth-context';
import { createApiClient, type ApiClient } from './api/client';

import { getDefaultTenantId, readSelectedTenantId } from './tenant-selection';

interface TenantContextValue {
  tenantId: string;
  environment: TenantEnvironment;
  setEnvironment: (env: TenantEnvironment) => void;
  api: ApiClient;
}

const TenantCtx = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { accessToken, user } = useAuth();
  const [tenantId, setTenantId] = useState(getDefaultTenantId);
  const [environment, setEnvironmentState] = useState<TenantEnvironment>(
    TenantEnvironment.PROD,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('tms-environment');
    if (stored && Object.values(TenantEnvironment).includes(stored as TenantEnvironment)) {
      setEnvironmentState(stored as TenantEnvironment);
    }
    setTenantId(user?.tenantId ?? readSelectedTenantId());
  }, [user?.tenantId]);

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
        tenantId: user?.tenantId ?? tenantId,
        environment,
        accessToken: accessToken ?? undefined,
      }),
    [environment, accessToken, tenantId, user?.tenantId],
  );

  const value = useMemo(
    () => ({
      tenantId: user?.tenantId ?? tenantId,
      environment,
      setEnvironment,
      api,
    }),
    [environment, setEnvironment, api, tenantId, user?.tenantId],
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
