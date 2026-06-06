'use client';

import { Badge, GlassCard, PageHeader, ProgressBar } from '@tms/ui';
import { useApi } from '@/lib/api/use-api';
import { ApiBanner } from '@/components/ApiBanner';
import styles from './shifts.module.css';

const FALLBACK_SHIFTS = [
  { id: '1', event: 'Brahmotsavam Setup', role: 'Decorations', hours: '4h', date: 'Jun 8' },
  { id: '2', event: 'Annadanam Service', role: 'Food prep', hours: '3h', date: 'Jun 9' },
  { id: '3', event: 'Parking & Queue', role: 'Crowd flow', hours: '5h', date: 'Jun 10' },
];

export default function VolunteerShiftsPage() {
  const { data: pipeline, loading, error } = useApi((ep) => ep.getEventPipeline());

  const activeEvents = pipeline
    ? Object.values(pipeline)
        .flat()
        .filter((e) => e.stage === 'confirmed' || e.stage === 'in_progress')
        .slice(0, 3)
    : [];

  return (
    <>
      <PageHeader
        title="Volunteering"
        subtitle="Your shifts, hours logged, and event coordination tasks"
      />
      <ApiBanner loading={loading} error={error} />

      <div className={styles.grid}>
        <GlassCard title="Upcoming Shifts">
          <div className={styles.shifts}>
            {FALLBACK_SHIFTS.map((shift) => (
              <div key={shift.id} className={styles.shift}>
                <div>
                  <strong>{shift.event}</strong>
                  <p className="tms-t3">
                    {shift.role} · {shift.date} · {shift.hours}
                  </p>
                </div>
                <Badge variant="ok">Confirmed</Badge>
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
