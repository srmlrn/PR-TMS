'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTenant } from '@/lib/tenant-context';
import { createEndpoints, type Endpoints } from './endpoints';

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApi<T>(
  fetcher: (endpoints: Endpoints) => Promise<T>,
  deps: unknown[] = [],
): UseApiResult<T> {
  const { api } = useTenant();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetch = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    const endpoints = createEndpoints(api);

    setLoading(true);
    setError(null);

    fetcherRef
      .current(endpoints)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Request failed');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, tick, ...deps]);

  return { data, loading, error, refetch };
}
