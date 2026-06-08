'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, DataTable, GlassCard } from '@tms/ui';
import {
  UserRole,
  type CreateTenantUserInput,
  type Staff,
  type TenantUser,
  type TenantUserRole,
  type UpdateTenantUserInput,
} from '@tms/types';
import { PageIntro } from '@/components/AppPage';
import { useTenant } from '@/lib/tenant-context';
import styles from '../people.module.css';

const ASSIGNABLE_ROLES: { value: TenantUserRole; label: string }[] = [
  { value: UserRole.ADMIN, label: 'Admin' },
  { value: UserRole.FRONT_DESK, label: 'Front Desk' },
  { value: UserRole.PRIEST, label: 'Priest' },
  { value: UserRole.ACCOUNTANT, label: 'Accountant' },
  { value: UserRole.VOLUNTEER, label: 'Volunteer' },
];

const emptyForm = (): CreateTenantUserInput => ({
  email: '',
  name: '',
  role: UserRole.FRONT_DESK,
  password: '',
  staffId: undefined,
});

export default function UsersRolesPage() {
  const { api } = useTenant();
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [form, setForm] = useState<CreateTenantUserInput>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [userRes, staffRes] = await Promise.all([
        api.get<{ data: TenantUser[] }>('/users'),
        api.get<{ data: Staff[] }>('/staff', { params: { includeInactive: true } }),
      ]);
      setUsers(userRes.data);
      setStaff(staffRes.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(user: TenantUser) {
    setEditingId(user.id);
    setForm({
      email: user.email,
      name: user.name,
      role: user.role,
      password: '',
      staffId: user.staffId,
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
      if (editingId) {
        const body: UpdateTenantUserInput = {
          email: form.email,
          name: form.name,
          role: form.role,
          staffId: form.staffId || null,
        };
        if (form.password.trim()) {
          body.password = form.password;
        }
        await api.patch<TenantUser>(`/users/${editingId}`, body);
      } else {
        await api.post<TenantUser>('/users', form);
      }
      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save user');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: TenantUser) {
    try {
      await api.patch<TenantUser>(`/users/${user.id}`, { isActive: !user.isActive });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update user');
    }
  }

  function staffLabel(staffId?: string) {
    if (!staffId) return '—';
    return staff.find((s) => s.id === staffId)?.name ?? staffId.slice(0, 8);
  }

  return (
    <div>
      <PageIntro
        subtitle="Tenant login accounts (demo users still work; these are additional accounts)"
        actions={
          <Link href="/admin/people">
            <Button variant="glass">← People</Button>
          </Link>
        }
        showTenantContext={false}
      />

      {error && (
        <GlassCard className={styles.errorCard}>
          <p>{error}</p>
        </GlassCard>
      )}

      <GlassCard title={editingId ? 'Edit User' : 'Create User'}>
        <div className={styles.configGrid}>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </label>
          <label>
            Display name
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label>
            Role
            <select
              value={form.role}
              onChange={(e) =>
                setForm((f) => ({ ...f, role: e.target.value as TenantUserRole }))
              }
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Link to staff
            <select
              value={form.staffId ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, staffId: e.target.value || undefined }))
              }
            >
              <option value="">None</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
          </label>
          <label className={styles.fullWidth}>
            {editingId ? 'New password (leave blank to keep)' : 'Password'}
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </label>
        </div>
        <div className={styles.actions}>
          <Button
            onClick={() => void handleSubmit()}
            disabled={
              saving ||
              !form.email.trim() ||
              !form.name.trim() ||
              (!editingId && form.password.length < 6)
            }
          >
            {saving ? 'Saving…' : editingId ? 'Update' : 'Create User'}
          </Button>
          {editingId && (
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>
      </GlassCard>

      <GlassCard title="Accounts" noBodyPadding>
        {loading ? (
          <p className="tms-t2 p1">Loading…</p>
        ) : (
          <DataTable
            getRowKey={(row) => row.id}
            data={users}
            columns={[
              { key: 'name', header: 'Name', render: (r) => r.name },
              { key: 'email', header: 'Email', render: (r) => r.email },
              { key: 'role', header: 'Role', render: (r) => r.role },
              { key: 'staff', header: 'Staff', render: (r) => staffLabel(r.staffId) },
              {
                key: 'active',
                header: 'Active',
                render: (r) => (
                  <Badge variant={r.isActive ? 'ok' : 'error'}>
                    {r.isActive ? 'Yes' : 'No'}
                  </Badge>
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
                    <Button variant="glass" onClick={() => void toggleActive(r)}>
                      {r.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </GlassCard>
    </div>
  );
}
