'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge, Button, DataTable, GlassCard } from '@tms/ui';
import { AppPage } from '@/components/AppPage';
import { UserRole, type Committee, type CreateCommitteeInput } from '@tms/types';
import { createEndpoints } from '@/lib/api/endpoints';
import { useAuth } from '@/lib/auth-context';
import { getLandingRoles } from '@/lib/landing-roles';
import { useTenant } from '@/lib/tenant-context';
import { resolveActiveTenantId } from '@/lib/tenant-site';
import { useApi } from '@/lib/api/use-api';

const emptyForm = (): CreateCommitteeInput => ({
  name: '',
  description: '',
  purpose: '',
});

export default function AdminCommitteesPage() {
  const { user } = useAuth();
  const { api, tenantId } = useTenant();
  const activeTenantId = resolveActiveTenantId(user?.tenantId, tenantId);
  const committeeEmail =
    getLandingRoles(activeTenantId).find((r) => r.role === UserRole.COMMITTEE)?.loginEmail ??
    'committee@svtemple.org';
  const [form, setForm] = useState<CreateCommitteeInput>(emptyForm());
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApi((ep) => ep.getCommittees());
  const committees = data?.data ?? [];

  async function handleCreate() {
    if (!form.name.trim()) {
      setMsg('Committee name is required');
      return;
    }
    setCreating(true);
    setMsg(null);
    try {
      const ep = createEndpoints(api);
      await ep.createCommittee({
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        purpose: form.purpose?.trim() || undefined,
      });
      setForm(emptyForm());
      setMsg('Committee created.');
      await refetch();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppPage
      subtitle="Governance committees, members, tasks, and approvals"
      loading={loading}
      error={error}
      showTenantContext={false}
    >

      <div className="grid2 mb2">
        <GlassCard title="Create committee" compact>
          <div className="formStack">
            <label>
              Name
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Finance Committee"
              />
            </label>
            <label>
              Purpose
              <input
                value={form.purpose ?? ''}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder="Primary mandate"
              />
            </label>
            <label>
              Description
              <textarea
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </label>
            <Button size="sm" onClick={() => void handleCreate()} disabled={creating}>
              {creating ? 'Creating…' : 'Create committee'}
            </Button>
            {msg && <p className="hint">{msg}</p>}
          </div>
        </GlassCard>

        <GlassCard title="Overview" compact>
          <p className="hint mb1">
            Committees manage calendar blocks, KPI targets, task assignments, and approval
            workflows. Committee members log in with the <strong>committee</strong> role.
          </p>
          <p className="hint">
            Demo login: <code>{committeeEmail}</code> / demo123
          </p>
        </GlassCard>
      </div>

      <GlassCard title={`Committees (${committees.length})`} compact>
        <DataTable<Committee>
          getRowKey={(c) => c.id}
          columns={[
            {
              key: 'name',
              header: 'Name',
              render: (c) => (
                <Link href={`/admin/committees/${c.id}`}>{c.name}</Link>
              ),
            },
            {
              key: 'purpose',
              header: 'Purpose',
              render: (c) => c.purpose ?? '—',
            },
            {
              key: 'members',
              header: 'Members',
              render: (c) => c.memberCount ?? 0,
            },
            {
              key: 'status',
              header: 'Status',
              render: (c) => (
                <Badge variant={c.isActive ? 'ok' : 'pending'}>
                  {c.isActive ? 'Active' : 'Inactive'}
                </Badge>
              ),
            },
          ]}
          data={committees}
        />
        {committees.length === 0 && <p className="hint mt1">No committees yet</p>}
      </GlassCard>
    </AppPage>
  );
}
