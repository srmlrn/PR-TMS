'use client';

import { useState } from 'react';
import { Badge, Button, GlassCard } from '@tms/ui';
import type { CommitteeRequest } from '@tms/types';
import { AppPage } from '@/components/AppPage';
import { PersonRow } from '@/components/PersonAvatar';
import { createEndpoints, formatShortDate } from '@/lib/api/endpoints';
import { useTenant } from '@/lib/tenant-context';
import { useApi } from '@/lib/api/use-api';
import { useCommitteeScope } from '@/lib/use-committee-scope';

export default function CommitteeApprovalsPage() {
  const { api } = useTenant();
  const { scopeParams, scopeSubtitle, committeeName } = useCommitteeScope();
  const [actionId, setActionId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApi(
    (ep) => ep.getMyPendingApprovals(scopeParams),
    [scopeParams.committeeId],
  );
  const approvals = data?.data ?? [];

  async function review(request: CommitteeRequest, status: 'approved' | 'rejected') {
    setActionId(request.id);
    setMsg(null);
    try {
      await createEndpoints(api).updateCommitteeRequest(request.committeeId, request.id, {
        status,
      });
      setMsg(`Request ${status}.`);
      await refetch();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionId(null);
    }
  }

  return (
    <AppPage subtitle={scopeSubtitle} loading={loading} error={error} showTenantContext={false}>
      <GlassCard title={`Pending approvals (${approvals.length})`} compact>
        {approvals.length === 0 ? (
          <p className="hint">
            No requests awaiting your approval. Chairs and co-chairs see pending items here.
          </p>
        ) : (
          approvals.map((r) => (
            <div key={r.id} className="listRow">
              <div className="listRowMain">
                <div className="flexBetween" style={{ gap: '0.5rem', marginBottom: '0.15rem' }}>
                  <div className="listRowTitle">{r.title}</div>
                  <Badge variant="pending">{r.status}</Badge>
                </div>
                <p className="hint">
                  {committeeName(r.committeeId)} · {r.type.replace('_', ' ')} ·{' '}
                  {formatShortDate(r.createdAt)}
                </p>
                {r.description && <p className="hint">{r.description}</p>}
                {r.requestedByName && (
                  <div style={{ marginTop: '0.35rem' }}>
                    <PersonRow name={r.requestedByName} subtitle="Requester" />
                  </div>
                )}
              </div>
              <div className="listRowActions">
                <Button
                  size="sm"
                  disabled={actionId === r.id}
                  onClick={() => void review(r, 'approved')}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionId === r.id}
                  onClick={() => void review(r, 'rejected')}
                >
                  Reject
                </Button>
              </div>
            </div>
          ))
        )}
        {msg && <p className="hint mt1">{msg}</p>}
      </GlassCard>
    </AppPage>
  );
}
