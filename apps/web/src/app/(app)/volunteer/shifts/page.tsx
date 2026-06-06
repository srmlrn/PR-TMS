'use client';

import { useState } from 'react';
import { Badge, Button, GlassCard, PageHeader, ProgressBar } from '@tms/ui';
import type { VolunteerShift } from '@tms/types';
import { useAuth } from '@/lib/auth-context';
import { createEndpoints, formatShortDate } from '@/lib/api/endpoints';
import { useTenant } from '@/lib/tenant-context';
import { useApi } from '@/lib/api/use-api';
import { ApiBanner } from '@/components/ApiBanner';
import styles from './shifts.module.css';

function shiftHours(shift: VolunteerShift): string {
  return `${shift.startTime}–${shift.endTime}`;
}

function isSignedUp(shift: VolunteerShift, userId?: string): boolean {
  return !!userId && shift.signups.some((s) => s.userId === userId);
}

function isCheckedIn(shift: VolunteerShift, userId?: string): boolean {
  return !!userId && shift.signups.some((s) => s.userId === userId && s.checkedIn);
}

function slotsRemaining(shift: VolunteerShift): number {
  return Math.max(0, shift.slots - shift.signups.length);
}

export default function VolunteerShiftsPage() {
  const { api } = useTenant();
  const { user } = useAuth();
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: pipeline, loading: pipelineLoading, error: pipelineError } = useApi((ep) =>
    ep.getEventPipeline(),
  );

  const {
    data: shiftsData,
    loading: shiftsLoading,
    error: shiftsError,
    refetch,
  } = useApi((ep) => ep.getVolunteerShifts());

  const shifts = shiftsData?.data ?? [];
  const myShifts = shifts.filter((s) => isSignedUp(s, user?.id));
  const openShifts = shifts.filter(
    (s) => !isSignedUp(s, user?.id) && slotsRemaining(s) > 0,
  );

  const activeEvents = pipeline
    ? Object.values(pipeline)
        .flat()
        .filter((e) => e.stage === 'confirmed' || e.stage === 'in_progress')
        .slice(0, 3)
    : [];

  async function handleSignup(shiftId: string) {
    setActionId(shiftId);
    setActionError(null);
    setActionMsg(null);
    try {
      const ep = createEndpoints(api);
      const updated = await ep.signupVolunteerShift(shiftId);
      setActionMsg(`Signed up for ${updated.title}.`);
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not sign up');
    } finally {
      setActionId(null);
    }
  }

  async function handleCheckIn(shiftId: string) {
    setActionId(shiftId);
    setActionError(null);
    setActionMsg(null);
    try {
      const ep = createEndpoints(api);
      await ep.checkinVolunteerShift(shiftId);
      setActionMsg('Checked in successfully.');
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not check in');
    } finally {
      setActionId(null);
    }
  }

  const loading = pipelineLoading || shiftsLoading;
  const error = pipelineError ?? shiftsError;

  return (
    <>
      <PageHeader
        title="Volunteering"
        subtitle="Your shifts, hours logged, and event coordination tasks"
      />
      <ApiBanner loading={loading} error={error} />

      <div className={styles.grid}>
        <GlassCard title="Open Shifts">
          <p className="tms-t3 mb1">Browse available shifts and sign up directly.</p>
          {openShifts.length === 0 ? (
            <p className="tms-t3">No open shifts right now.</p>
          ) : (
            <div className={styles.shifts}>
              {openShifts.map((shift) => (
                <div key={shift.id} className={styles.shift}>
                  <div>
                    <strong>{shift.title}</strong>
                    <p className="tms-t3">
                      {formatShortDate(shift.date)} · {shiftHours(shift)} ·{' '}
                      {slotsRemaining(shift)} slot{slotsRemaining(shift) === 1 ? '' : 's'} left
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSignup(shift.id)}
                    disabled={actionId === shift.id}
                  >
                    {actionId === shift.id ? '…' : 'Sign up'}
                  </Button>
                </div>
              ))}
            </div>
          )}
          {(actionMsg || actionError) && (
            <p className={`tms-t3 mt1${actionError ? '' : ''}`} style={actionError ? { color: 'var(--red)' } : undefined}>
              {actionError ?? actionMsg}
            </p>
          )}
        </GlassCard>

        <GlassCard title="My Shifts">
          <div className={styles.shifts}>
            {myShifts.length === 0 ? (
              <p className="tms-t3">You have not signed up for any shifts yet.</p>
            ) : (
              myShifts.map((shift) => (
                <div key={shift.id} className={styles.shift}>
                  <div>
                    <strong>{shift.title}</strong>
                    <p className="tms-t3">
                      {formatShortDate(shift.date)} · {shiftHours(shift)}
                    </p>
                  </div>
                  <div className={styles.shiftActions}>
                    {isCheckedIn(shift, user?.id) ? (
                      <Badge variant="ok">Checked in</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCheckIn(shift.id)}
                        disabled={actionId === shift.id}
                      >
                        {actionId === shift.id ? '…' : 'Check in'}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        <GlassCard title="Active Events Needing Help">
          {(activeEvents.length
            ? activeEvents
            : [{ id: 'e1', name: 'Brahmotsavam 2026', stage: 'in_progress' as const }]
          ).map((event) => (
            <div key={event.id} className={styles.eventRow}>
              <strong>{event.name}</strong>
              <ProgressBar value={65} color="amber" />
              <span className="tms-t3">Checklist 65% complete · 4 volunteers needed</span>
            </div>
          ))}
        </GlassCard>

        <GlassCard title="Recognition">
          <p className="tms-t2">🌟 42 hours logged this quarter</p>
          <p className="tms-t3">Silver seva badge · Next: Gold at 60 hours</p>
          <ProgressBar value={70} color="silver" className="mt1" />
        </GlassCard>
      </div>
    </>
  );
}
