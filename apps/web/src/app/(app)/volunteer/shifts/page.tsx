'use client';

import { useState } from 'react';
import { Badge, Button, GlassCard, PageHeader, ProgressBar } from '@tms/ui';
import { useApi } from '@/lib/api/use-api';
import { ApiBanner } from '@/components/ApiBanner';
import styles from './shifts.module.css';

interface VolunteerShift {
  id: string;
  event: string;
  role: string;
  hours: string;
  date: string;
  signedUpAt: string;
  checkedIn: boolean;
}

const FALLBACK_SHIFTS: VolunteerShift[] = [
  {
    id: '1',
    event: 'Brahmotsavam Setup',
    role: 'Decorations',
    hours: '4h',
    date: 'Jun 8',
    signedUpAt: new Date().toISOString(),
    checkedIn: false,
  },
  {
    id: '2',
    event: 'Annadanam Service',
    role: 'Food prep',
    hours: '3h',
    date: 'Jun 9',
    signedUpAt: new Date().toISOString(),
    checkedIn: true,
  },
  {
    id: '3',
    event: 'Parking & Queue',
    role: 'Crowd flow',
    hours: '5h',
    date: 'Jun 10',
    signedUpAt: new Date().toISOString(),
    checkedIn: false,
  },
];

export default function VolunteerShiftsPage() {
  const { data: pipeline, loading, error } = useApi((ep) => ep.getEventPipeline());
  const [shifts, setShifts] = useState<VolunteerShift[]>(FALLBACK_SHIFTS);
  const [eventName, setEventName] = useState('');
  const [role, setRole] = useState('');
  const [shiftDate, setShiftDate] = useState('');
  const [hours, setHours] = useState('3h');
  const [signUpMsg, setSignUpMsg] = useState<string | null>(null);

  const activeEvents = pipeline
    ? Object.values(pipeline)
        .flat()
        .filter((e) => e.stage === 'confirmed' || e.stage === 'in_progress')
        .slice(0, 3)
    : [];

  const eventOptions = activeEvents.length
    ? activeEvents.map((e) => e.name)
    : ['Brahmotsavam 2026', 'Annadanam Service', 'Parking & Queue'];

  function handleSignUp() {
    if (!eventName.trim() || !role.trim() || !shiftDate) {
      setSignUpMsg('Event, role, and date are required.');
      return;
    }
    const newShift: VolunteerShift = {
      id: `local-${Date.now()}`,
      event: eventName.trim(),
      role: role.trim(),
      hours: hours.trim() || '3h',
      date: shiftDate,
      signedUpAt: new Date().toISOString(),
      checkedIn: false,
    };
    setShifts((prev) => [newShift, ...prev]);
    setSignUpMsg(`Signed up for ${newShift.event} (mock — no volunteer API yet).`);
    setRole('');
    setShiftDate('');
  }

  function handleCheckIn(id: string) {
    setShifts((prev) =>
      prev.map((s) => (s.id === id ? { ...s, checkedIn: true } : s)),
    );
  }

  return (
    <>
      <PageHeader
        title="Volunteering"
        subtitle="Your shifts, hours logged, and event coordination tasks"
      />
      <ApiBanner loading={loading} error={error} />

      <div className={styles.grid}>
        <GlassCard title="Sign Up for a Shift">
          <p className="tms-t3 mb1">
            Volunteer shift API not available — sign-ups stored locally for this session.
          </p>
          <div className={styles.formGrid}>
            <div className="formGroup">
              <label htmlFor="volEvent">Event</label>
              <select
                id="volEvent"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
              >
                <option value="">Select event</option>
                {eventOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="formGroup">
              <label htmlFor="volRole">Role</label>
              <input
                id="volRole"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Food prep"
              />
            </div>
            <div className="formGroup">
              <label htmlFor="volDate">Date</label>
              <input
                id="volDate"
                type="date"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
              />
            </div>
            <div className="formGroup">
              <label htmlFor="volHours">Hours</label>
              <input
                id="volHours"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="3h"
              />
            </div>
          </div>
          <Button onClick={handleSignUp}>Sign up</Button>
          {signUpMsg && <p className="tms-t3 mt1">{signUpMsg}</p>}
        </GlassCard>

        <GlassCard title="Upcoming Shifts">
          <div className={styles.shifts}>
            {shifts.map((shift) => (
              <div key={shift.id} className={styles.shift}>
                <div>
                  <strong>{shift.event}</strong>
                  <p className="tms-t3">
                    {shift.role} · {shift.date} · {shift.hours}
                  </p>
                </div>
                <div className={styles.shiftActions}>
                  {shift.checkedIn ? (
                    <Badge variant="ok">Checked in</Badge>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleCheckIn(shift.id)}>
                      Check in
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard title="Active Events Needing Help">
          {(activeEvents.length ? activeEvents : [{ id: 'e1', name: 'Brahmotsavam 2026', stage: 'in_progress' as const }]).map(
            (event) => (
              <div key={event.id} className={styles.eventRow}>
                <strong>{event.name}</strong>
                <ProgressBar value={65} color="amber" />
                <span className="tms-t3">Checklist 65% complete · 4 volunteers needed</span>
              </div>
            ),
          )}
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
