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
import type { Committee } from '@tms/types';
import { createEndpoints } from '@/lib/api/endpoints';
import {
  ALL_COMMITTEES,
  isAllCommittees,
  readSelectedCommitteeId,
  writeSelectedCommitteeId,
} from '@/lib/committee-selection';
import { useTenant } from '@/lib/tenant-context';

interface CommitteeContextValue {
  committees: Committee[];
  loading: boolean;
  activeCommitteeId: string;
  isAllCommittees: boolean;
  activeCommittee: Committee | null;
  setActiveCommitteeId: (id: string) => void;
  committeeName: (committeeId: string) => string;
  scopeParams: { committeeId?: string };
  appliesScope: boolean;
}

const CommitteeContext = createContext<CommitteeContextValue | null>(null);

export function CommitteeProvider({ children }: { children: ReactNode }) {
  const { api, tenantId } = useTenant();
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCommitteeId, setActiveCommitteeIdState] = useState(ALL_COMMITTEES);

  useEffect(() => {
    setActiveCommitteeIdState(readSelectedCommitteeId(tenantId));
  }, [tenantId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    createEndpoints(api)
      .getCommittees({ mine: true })
      .then((res) => {
        if (cancelled) return;
        setCommittees(res.data);
      })
      .catch(() => {
        if (!cancelled) setCommittees([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, tenantId]);

  useEffect(() => {
    if (loading || committees.length === 0) return;
    if (
      !isAllCommittees(activeCommitteeId) &&
      !committees.some((c) => c.id === activeCommitteeId)
    ) {
      const next = ALL_COMMITTEES;
      setActiveCommitteeIdState(next);
      writeSelectedCommitteeId(tenantId, next);
    }
  }, [loading, committees, activeCommitteeId, tenantId]);

  const setActiveCommitteeId = useCallback(
    (id: string) => {
      setActiveCommitteeIdState(id);
      writeSelectedCommitteeId(tenantId, id);
    },
    [tenantId],
  );

  const committeeName = useCallback(
    (committeeId: string) => committees.find((c) => c.id === committeeId)?.name ?? 'Committee',
    [committees],
  );

  const isAll = isAllCommittees(activeCommitteeId);
  const activeCommittee = isAll
    ? null
    : (committees.find((c) => c.id === activeCommitteeId) ?? null);

  const scopeParams = isAll ? {} : { committeeId: activeCommitteeId };

  const value = useMemo(
    () => ({
      committees,
      loading,
      activeCommitteeId,
      isAllCommittees: isAll,
      activeCommittee,
      setActiveCommitteeId,
      committeeName,
      scopeParams,
      appliesScope: true,
    }),
    [
      committees,
      loading,
      activeCommitteeId,
      isAll,
      activeCommittee,
      setActiveCommitteeId,
      committeeName,
      scopeParams,
    ],
  );

  return <CommitteeContext.Provider value={value}>{children}</CommitteeContext.Provider>;
}

export function useCommitteeContext(): CommitteeContextValue {
  const ctx = useContext(CommitteeContext);
  if (!ctx) {
    throw new Error('useCommitteeContext must be used within CommitteeProvider');
  }
  return ctx;
}

/** Safe fallback when context is unavailable (e.g. admin preview) */
export function useCommitteeContextOptional(): CommitteeContextValue | null {
  return useContext(CommitteeContext);
}
