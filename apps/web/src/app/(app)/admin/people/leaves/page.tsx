'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, DataTable, GlassCard } from '@tms/ui';
import type {
  CreateStaffLeaveInput,
  Staff,
  StaffLeave,
  StaffLeaveStatus,
  StaffLeaveType,
  UpdateStaffLeaveInput,
} from '@tms/types';
import { PageIntro } from '@/components/AppPage';
import { formatShortDate } from '@/lib/api/endpoints';
import { useTenant } from '@/lib/tenant-context';
import styles from '../people.module.css';

const LEAVE_TYPES: StaffLeaveType[] = ['annual', 'sick', 'personal', 'festival', 'other'];

const emptyForm = (staffId?: string): CreateStaffLeaveInput => ({
  staffId: staffId ?? '',
  type: 'annual',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  reason: '',
});

function statusVariant(status: StaffLeaveStatus): 'ok' | 'pending' | 'error' | 'info' {
  if (status === 'approved') return 'ok';
  if (status === 'pending') return 'pending';
  if (status === 'rejected') return 'error';
  return 'info';
}

export default function LeaveManagementPage() {
  const { api } = useTenant();
  const [leaves, setLeaves] = useState<StaffLeave[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [form, setForm] = useState<CreateStaffLeaveInput>(emptyForm());
  const [filterStatus, setFilterStatus] = useState<StaffLeaveStatus | ''>('pending');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      const [leaveRes, staffRes] = await Promise.all([
        api.get<{ data: StaffLeave[] }>('/staff/leaves', { params }),
        api.get<{ data: Staff[] }>('/staff', { params: { includeInactive: true } }),
      ]);
      setLeaves(leaveRes.data);
      setStaff(staffRes.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load leaves');
    } finally {
      setLoading(false);
    }
  }, [api, filterStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      await api.post<StaffLeave>('/staff/leaves', {
        ...form,
        reason: form.reason || undefined,
      });
      setForm(emptyForm(form.staffId));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit leave');
    } finally {
      setSaving(false);
    }
  }

  async function reviewLeave(id: string, status: StaffLeaveStatus, adminNote?: string) {
    try {
      const body: UpdateStaffLeaveInput = { status, adminNote };
      await api.patch<StaffLeave>(`/staff/leaves/${id}`, body);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update leave');
    }
  }

  return (
    <div>
      <PageIntro
        subtitle="Approve priest and staff time off"
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

      <GlassCard title="Request Leave (admin on behalf of staff)">
        <div className={styles.configGrid}>
          <label>
            Staff member
            <select
              value={form.staffId}
              onChange={(e) => setForm((f) => ({ ...f, staffId: e.target.value }))}
            >
              <option value="">Select…</option>
              {staff
                .filter((s) => s.isActive)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
            </select>
          </label>
          <label>
            Type
            <select
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({ ...f, type: e.target.value as StaffLeaveType }))
              }
            >
              {LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            Start date
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            />
          </label>
          <label>
            End date
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </label>
          <label className={styles.fullWidth}>
            Reason
            <textarea
              rows={2}
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            />
          </label>
        </div>
        <Button
          onClick={() => void handleSubmit()}
          disabled={saving || !form.staffId}
        >
          {saving ? 'Submitting…' : 'Submit Request'}
        </Button>
      </GlassCard>

      <GlassCard
        title="Leave Requests"
        noBodyPadding
        headerRight={
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as StaffLeaveStatus | '')}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        }
      >
        {loading ? (
          <p className="tms-t2 p1">Loading…</p>
        ) : (
          <DataTable
            getRowKey={(row) => row.id}
            data={leaves}
            columns={[
              {
                key: 'staff',
                header: 'Staff',
                render: (r) => r.staffName ?? r.staffId.slice(0, 8),
              },
              { key: 'type', header: 'Type', render: (r) => r.type },
              {
                key: 'dates',
                header: 'Dates',
                render: (r) =>
                  `${formatShortDate(r.startDate)} – ${formatShortDate(r.endDate)}`,
              },
              {
                key: 'status',
                header: 'Status',
                render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge>,
              },
              { key: 'reason', header: 'Reason', render: (r) => r.reason ?? '—' },
              {
                key: 'actions',
                header: '',
                render: (r) =>
                  r.status === 'pending' ? (
                    <div className={styles.tableActions}>
                      <Button
                        variant="outline"
                        onClick={() => void reviewLeave(r.id, 'approved')}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="glass"
                        onClick={() => void reviewLeave(r.id, 'rejected', 'Not approved')}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : r.status === 'approved' ? (
                    <Button
                      variant="glass"
                      onClick={() => void reviewLeave(r.id, 'cancelled')}
                    >
                      Cancel
                    </Button>
                  ) : null,
              },
            ]}
          />
        )}
      </GlassCard>
    </div>
  );
}
