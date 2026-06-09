'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, DataTable, GlassCard } from '@tms/ui';
import type {
  CreateStaffLeaveInput,
  StaffLeave,
  StaffLeaveStatus,
  StaffLeaveType,
} from '@tms/types';
import { PageIntro } from '@/components/AppPage';
import { ApiBanner } from '@/components/ApiBanner';
import { formatShortDate } from '@/lib/api/endpoints';
import { useAuth } from '@/lib/auth-context';
import { useTenant } from '@/lib/tenant-context';
import { useApi } from '@/lib/api/use-api';

const LEAVE_TYPES: StaffLeaveType[] = ['annual', 'sick', 'personal', 'festival', 'other'];

function statusVariant(status: StaffLeaveStatus): 'ok' | 'pending' | 'error' | 'info' {
  if (status === 'approved') return 'ok';
  if (status === 'pending') return 'pending';
  if (status === 'rejected') return 'error';
  return 'info';
}

const emptyForm = (staffId: string): CreateStaffLeaveInput => ({
  staffId,
  type: 'annual',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  reason: '',
});

export default function PriestLeavePage() {
  const { api } = useTenant();
  const { user } = useAuth();
  const [filterStatus, setFilterStatus] = useState<StaffLeaveStatus | ''>('');
  const [form, setForm] = useState<CreateStaffLeaveInput | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageOk, setMessageOk] = useState(true);

  const { data: staffData, loading: staffLoading, error: staffError } = useApi((ep) =>
    ep.getStaff({ role: 'priest' }),
  );

  const myStaff = useMemo(() => {
    const roster = staffData?.data ?? [];
    if (!user) return undefined;
    return roster.find(
      (s) =>
        s.userId === user.id ||
        (user.email && s.email?.toLowerCase() === user.email.toLowerCase()),
    );
  }, [staffData, user]);

  const leaveParams = filterStatus ? { status: filterStatus } : undefined;
  const {
    data: leaveData,
    loading: leaveLoading,
    error: leaveError,
    refetch,
  } = useApi((ep) => ep.getStaffLeaves(leaveParams), [filterStatus]);

  const leaves = leaveData?.data ?? [];
  const loading = staffLoading || leaveLoading;
  const error = staffError ?? leaveError;

  async function handleSubmit() {
    if (!form || !myStaff) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.post('/staff/leaves', {
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason?.trim() || undefined,
      });
      setMessage('Leave request submitted. Admin will review it.');
      setMessageOk(true);
      setForm(emptyForm(myStaff.id));
      await refetch();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to submit leave');
      setMessageOk(false);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (myStaff) {
      setForm((current) => current ?? emptyForm(myStaff.id));
    }
  }, [myStaff]);

  return (
    <div className="pageShell">
      <PageIntro
        subtitle="Request time off and track approval status"
        showTenantContext={false}
      />

      <div className="calloutAmber mb2">
        <strong>Who reviews leave?</strong> Temple <strong>Admin</strong> approves or rejects
        requests at <strong>People → Leave Management</strong>. You will
        see the status here once reviewed.
      </div>

      <ApiBanner loading={loading} error={error} />

      {message && (
        <p className={`tms-t2 mb2 ${messageOk ? 'statusMsgOk' : 'statusMsgError'}`}>{message}</p>
      )}

      {!myStaff && !staffLoading && (
        <GlassCard title="Staff profile not linked" compact>
          <p className="hint">
            Your login is not linked to a priest staff record. Ask admin to link your user under{' '}
            <strong>People → Staff</strong> before submitting leave.
          </p>
        </GlassCard>
      )}

      {myStaff && form && (
        <GlassCard title="Request leave" compact>
          <div className="formGrid">
            <div className="formGroup">
              <label htmlFor="leave-type">Type</label>
              <select
                id="leave-type"
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as StaffLeaveType })
                }
              >
                {LEAVE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="formGroup">
              <label htmlFor="leave-start">Start date</label>
              <input
                id="leave-start"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div className="formGroup">
              <label htmlFor="leave-end">End date</label>
              <input
                id="leave-end"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
            <div className="formGroup formGroupFull">
              <label htmlFor="leave-reason">Reason (optional)</label>
              <input
                id="leave-reason"
                value={form.reason ?? ''}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Festival travel, medical, family event…"
              />
            </div>
          </div>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? 'Submitting…' : 'Submit leave request'}
          </Button>
        </GlassCard>
      )}

      <GlassCard
        title="My leave requests"
        compact
        noBodyPadding
        headerRight={
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as StaffLeaveStatus | '')}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        }
      >
        {leaves.length === 0 && !loading ? (
          <p className="hint" style={{ padding: '0.85rem 1rem' }}>
            No leave requests yet.
          </p>
        ) : (
          <DataTable
            getRowKey={(r) => r.id}
            data={leaves}
            columns={[
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
              {
                key: 'reason',
                header: 'Reason',
                render: (r) => r.reason ?? '—',
              },
              {
                key: 'note',
                header: 'Admin note',
                render: (r) => r.adminNote ?? (r.status === 'pending' ? 'Awaiting review' : '—'),
              },
              {
                key: 'requested',
                header: 'Requested',
                render: (r) => formatShortDate(r.requestedAt),
              },
            ]}
          />
        )}
      </GlassCard>
    </div>
  );
}
