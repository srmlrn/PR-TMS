'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, DataTable, GlassCard } from '@tms/ui';
import type { CreateStaffInput, Staff, StaffRole, UpdateStaffInput } from '@tms/types';
import { AppPage } from '@/components/AppPage';
import { DEMO_STAFF } from '@/lib/demo-fallbacks';
import { useTenant } from '@/lib/tenant-context';
import styles from '../people.module.css';

const ROLES: StaffRole[] = ['priest', 'frontdesk', 'volunteer'];

const emptyForm = (): CreateStaffInput => ({
  name: '',
  role: 'priest',
  email: '',
  phone: '',
  title: '',
  department: '',
  notes: '',
});

export default function StaffRosterPage() {
  const { api } = useTenant();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [form, setForm] = useState<CreateStaffInput>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: Staff[] }>('/staff', {
        params: { includeInactive },
      });
      setStaff(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, [api, includeInactive]);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(member: Staff) {
    setEditingId(member.id);
    setForm({
      name: member.name,
      role: member.role,
      email: member.email ?? '',
      phone: member.phone ?? '',
      title: member.title ?? '',
      department: member.department ?? '',
      notes: member.notes ?? '',
      userId: member.userId,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm());
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const body: CreateStaffInput | UpdateStaffInput = {
        name: form.name,
        role: form.role,
        email: form.email || undefined,
        phone: form.phone || undefined,
        title: form.title || undefined,
        department: form.department || undefined,
        notes: form.notes || undefined,
        userId: form.userId || undefined,
      };
      if (editingId) {
        await api.patch<Staff>(`/staff/${editingId}`, body);
      } else {
        await api.post<Staff>('/staff', body);
      }
      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save staff');
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(id: string) {
    try {
      await api.post<Staff>(`/staff/${id}/deactivate`, {});
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to deactivate');
    }
  }

  const roster = error && staff.length === 0 ? DEMO_STAFF : staff;

  return (
    <AppPage
      subtitle="Temple employees and volunteers"
      loading={loading}
      error={error}
      showTenantContext={false}
      actions={
        <Link href="/admin/people">
          <Button variant="glass">← People</Button>
        </Link>
      }
    >

      <GlassCard title={editingId ? 'Edit Staff' : 'Add Staff'} className={styles.configGrid}>
        <div className={styles.configGrid}>
          <label>
            Name
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label>
            Role
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as StaffRole }))}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </label>
          <label>
            Phone
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </label>
          <label>
            Title
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </label>
          <label>
            Department
            <input
              value={form.department}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
            />
          </label>
          <label className={styles.fullWidth}>
            Notes
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </label>
        </div>
        <div className={styles.actions}>
          <Button onClick={() => void handleSubmit()} disabled={saving || !form.name.trim()}>
            {saving ? 'Saving…' : editingId ? 'Update' : 'Add Staff'}
          </Button>
          {editingId && (
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>
      </GlassCard>

      <GlassCard
        title="Roster"
        noBodyPadding
        headerRight={
          <label className="tms-t2" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
            />
            Show inactive
          </label>
        }
      >
        {loading ? (
          <p className="tms-t2 p1">Loading…</p>
        ) : (
          <DataTable
            getRowKey={(row) => row.id}
            data={roster}
            columns={[
              { key: 'name', header: 'Name', render: (r) => r.name },
              { key: 'role', header: 'Role', render: (r) => r.role },
              { key: 'title', header: 'Title', render: (r) => r.title ?? '—' },
              { key: 'dept', header: 'Department', render: (r) => r.department ?? '—' },
              {
                key: 'status',
                header: 'Status',
                render: (r) => (
                  <>
                    {!r.isActive && <Badge variant="error">Inactive</Badge>}
                    {r.onLeaveToday && <Badge variant="pending">On leave</Badge>}
                    {r.isActive && !r.onLeaveToday && <Badge variant="ok">Active</Badge>}
                  </>
                ),
              },
              {
                key: 'actions',
                header: '',
                render: (r) => (
                  <div className={styles.tableActions}>
                    <Button variant="outline" onClick={() => startEdit(r)}>
                      Edit
                    </Button>
                    {r.isActive && (
                      <Button variant="glass" onClick={() => void deactivate(r.id)}>
                        Deactivate
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </GlassCard>
    </AppPage>
  );
}
