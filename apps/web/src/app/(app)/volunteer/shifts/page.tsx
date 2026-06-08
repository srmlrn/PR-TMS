'use client';

import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  GlassCard,
  ProgressBar,
  StatTile,
} from '@tms/ui';
import type {
  CreateVolunteerShiftInput,
  InAppNotification,
  VolunteerCategory,
  VolunteerOpportunity,
  VolunteerPreferences,
  VolunteerShift,
  VolunteerShiftRole,
  VolunteerSignup,
} from '@tms/types';
import { UserRole } from '@tms/types';
import { useAuth } from '@/lib/auth-context';
import { createEndpoints, formatShortDate } from '@/lib/api/endpoints';
import { useTenant } from '@/lib/tenant-context';
import { useApi } from '@/lib/api/use-api';
import { PageIntro } from '@/components/AppPage';
import { ApiBanner } from '@/components/ApiBanner';
import styles from './shifts.module.css';

type ShiftFilter = 'all' | 'open' | 'my' | 'past' | 'waitlist';

const ROLE_LABELS: Record<VolunteerShiftRole, string> = {
  general: 'General',
  kitchen: 'Kitchen',
  parking: 'Parking',
  setup: 'Setup',
  crowd: 'Crowd',
  kids: 'Kids',
  decoration: 'Decoration',
  cultural: 'Cultural',
  priest_assist: 'Priest Assist',
};

const CATEGORY_LABELS: Record<VolunteerCategory, string> = {
  festival: 'Festival',
  pooja: 'Pooja',
  annadanam: 'Annadanam',
  setup: 'Setup',
  cultural: 'Cultural',
  general: 'General',
};

const BADGE_LABELS = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
} as const;

const EMPTY_CREATE_FORM: CreateVolunteerShiftInput = {
  title: '',
  date: new Date().toISOString().slice(0, 10),
  startTime: '09:00',
  endTime: '13:00',
  slots: 4,
  description: '',
  location: '',
  role: 'general',
  eventName: '',
  coordinator: '',
};

function shiftHours(shift: VolunteerShift): string {
  return `${shift.startTime}–${shift.endTime}`;
}

function signupStatus(signup: VolunteerSignup): 'confirmed' | 'waitlisted' {
  return signup.status ?? 'confirmed';
}

function getSignup(shift: VolunteerShift, userId?: string): VolunteerSignup | undefined {
  return userId ? shift.signups.find((s) => s.userId === userId) : undefined;
}

function isSignedUp(shift: VolunteerShift, userId?: string): boolean {
  return !!getSignup(shift, userId);
}

function confirmedCount(shift: VolunteerShift): number {
  return shift.signups.filter((s) => signupStatus(s) === 'confirmed').length;
}

function slotsRemaining(shift: VolunteerShift): number {
  return Math.max(0, shift.slots - confirmedCount(shift));
}

function shiftEndDateTime(shift: VolunteerShift): Date {
  const [h, m] = shift.endTime.split(':').map(Number);
  const d = new Date(`${shift.date}T00:00:00`);
  d.setHours(h, m ?? 0, 0, 0);
  return d;
}

function isShiftPast(shift: VolunteerShift): boolean {
  return shiftEndDateTime(shift).getTime() < Date.now();
}

function capacityPercent(shift: VolunteerShift): number {
  if (shift.slots <= 0) return 0;
  return Math.min(100, Math.round((confirmedCount(shift) / shift.slots) * 100));
}

function filterShifts(
  shifts: VolunteerShift[],
  filter: ShiftFilter,
  userId?: string,
): VolunteerShift[] {
  switch (filter) {
    case 'open':
      return shifts.filter(
        (s) => !isShiftPast(s) && !isSignedUp(s, userId) && slotsRemaining(s) > 0,
      );
    case 'my':
      return shifts.filter((s) => {
        const signup = getSignup(s, userId);
        return !isShiftPast(s) && signup && signupStatus(signup) === 'confirmed';
      });
    case 'waitlist':
      return shifts.filter((s) => {
        const signup = getSignup(s, userId);
        return !isShiftPast(s) && signup && signupStatus(signup) === 'waitlisted';
      });
    case 'past':
      return shifts.filter((s) => isShiftPast(s));
    default:
      return shifts;
  }
}

export default function VolunteerShiftsPage() {
  const { api } = useTenant();
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const [filter, setFilter] = useState<ShiftFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<VolunteerCategory | 'all'>('all');
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [showPreferences, setShowPreferences] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsMsg, setPrefsMsg] = useState<string | null>(null);
  const [prefsForm, setPrefsForm] = useState<Pick<VolunteerPreferences, 'categories' | 'roles' | 'notifyNewOpportunities'>>({
    categories: [],
    roles: [],
    notifyNewOpportunities: true,
  });

  const {
    data: opportunitiesData,
    loading: oppLoading,
    error: oppError,
  } = useApi((ep) =>
    ep.getVolunteerOpportunities(
      categoryFilter === 'all' ? undefined : { category: categoryFilter },
    ),
  );

  const {
    data: shiftsData,
    loading: shiftsLoading,
    error: shiftsError,
    refetch: refetchShifts,
  } = useApi((ep) =>
    ep.getVolunteerShifts(categoryFilter === 'all' ? undefined : { category: categoryFilter }),
  );

  const {
    data: stats,
    loading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useApi((ep) => ep.getVolunteerStats());

  const {
    data: notificationsData,
    loading: notifLoading,
    error: notifError,
    refetch: refetchNotifications,
  } = useApi((ep) => ep.getInAppNotifications());

  const {
    data: templatesData,
    loading: templatesLoading,
  } = useApi((ep) => ep.getVolunteerRecurringTemplates());

  const {
    data: preferences,
    loading: prefsLoading,
    refetch: refetchPrefs,
  } = useApi((ep) => ep.getVolunteerPreferences());

  useEffect(() => {
    if (preferences) {
      setPrefsForm({
        categories: preferences.categories ?? [],
        roles: preferences.roles ?? [],
        notifyNewOpportunities: preferences.notifyNewOpportunities ?? true,
      });
    }
  }, [preferences]);

  const shifts = shiftsData?.data ?? [];
  const opportunities = opportunitiesData?.data ?? [];
  const notifications = notificationsData?.data ?? [];
  const templates = templatesData?.data ?? [];
  const unreadCount = notifications.filter((n) => !n.read).length;
  const visibleShifts = filterShifts(shifts, filter, user?.id);

  async function refetchAll() {
    await Promise.all([refetchShifts(), refetchStats(), refetchNotifications()]);
  }

  async function handleSignup(shiftId: string) {
    setActionId(shiftId);
    setActionError(null);
    setActionMsg(null);
    try {
      const ep = createEndpoints(api);
      const updated = await ep.signupVolunteerShift(shiftId);
      const signup = getSignup(updated, user?.id);
      const msg =
        signup && signupStatus(signup) === 'waitlisted'
          ? `Waitlisted for ${updated.title} (#${signup.waitlistPosition ?? '?'}).`
          : `Signed up for ${updated.title}.`;
      setActionMsg(msg);
      await refetchAll();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not sign up');
    } finally {
      setActionId(null);
    }
  }

  async function handleCancel(shiftId: string) {
    setActionId(shiftId);
    setActionError(null);
    setActionMsg(null);
    try {
      const ep = createEndpoints(api);
      const updated = await ep.cancelVolunteerSignup(shiftId);
      setActionMsg(`Cancelled signup for ${updated.title}.`);
      await refetchAll();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not cancel signup');
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
      await refetchAll();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not check in');
    } finally {
      setActionId(null);
    }
  }

  async function handleCheckout(shiftId: string) {
    setActionId(shiftId);
    setActionError(null);
    setActionMsg(null);
    try {
      const ep = createEndpoints(api);
      const updated = await ep.checkoutVolunteerShift(shiftId);
      const signup = getSignup(updated, user?.id);
      setActionMsg(
        signup?.hoursLogged != null
          ? `Checked out — ${signup.hoursLogged} hours logged.`
          : 'Checked out successfully.',
      );
      await refetchAll();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not check out');
    } finally {
      setActionId(null);
    }
  }

  async function handleMarkRead(notification: InAppNotification) {
    try {
      const ep = createEndpoints(api);
      await ep.markInAppNotificationRead(notification.id);
      await refetchNotifications();
    } catch {
      /* non-blocking */
    }
  }

  function toggleCategory(cat: VolunteerCategory) {
    setPrefsForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  }

  function toggleRole(role: VolunteerShiftRole) {
    setPrefsForm((prev) => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role],
    }));
  }

  async function handleSavePreferences() {
    setPrefsSaving(true);
    setPrefsMsg(null);
    try {
      const ep = createEndpoints(api);
      await ep.updateVolunteerPreferences(prefsForm);
      setPrefsMsg('Preferences saved.');
      await refetchPrefs();
    } catch (err) {
      setPrefsMsg(err instanceof Error ? err.message : 'Could not save preferences');
    } finally {
      setPrefsSaving(false);
    }
  }

  async function handleCreate() {
    setCreating(true);
    setActionError(null);
    setActionMsg(null);
    try {
      const ep = createEndpoints(api);
      const body: CreateVolunteerShiftInput = {
        title: createForm.title.trim(),
        date: createForm.date,
        startTime: createForm.startTime,
        endTime: createForm.endTime,
        slots: createForm.slots,
        ...(createForm.description?.trim() ? { description: createForm.description.trim() } : {}),
        ...(createForm.location?.trim() ? { location: createForm.location.trim() } : {}),
        ...(createForm.role ? { role: createForm.role } : {}),
        ...(createForm.eventName?.trim() ? { eventName: createForm.eventName.trim() } : {}),
        ...(createForm.coordinator?.trim() ? { coordinator: createForm.coordinator.trim() } : {}),
      };
      await ep.createVolunteerShift(body);
      setActionMsg(`Created shift "${body.title}".`);
      setCreateForm(EMPTY_CREATE_FORM);
      setShowCreate(false);
      await refetchAll();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not create shift');
    } finally {
      setCreating(false);
    }
  }

  function renderShiftActions(shift: VolunteerShift) {
    const signup = getSignup(shift, user?.id);
    const signedUp = !!signup;
    const past = isShiftPast(shift);
    const waitlisted = signup && signupStatus(signup) === 'waitlisted';

    if (!signedUp && !past) {
      return (
        <Button
          size="sm"
          onClick={() => handleSignup(shift.id)}
          disabled={actionId === shift.id}
        >
          {actionId === shift.id ? '…' : slotsRemaining(shift) > 0 ? 'Sign up' : 'Join waitlist'}
        </Button>
      );
    }

    if (!signedUp) return null;

    if (waitlisted) {
      return (
        <div className={styles.shiftActions}>
          <Badge variant="pending">Waitlist #{signup.waitlistPosition ?? '?'}</Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleCancel(shift.id)}
            disabled={actionId === shift.id}
          >
            Leave waitlist
          </Button>
        </div>
      );
    }

    if (signup.checkedOut) {
      return (
        <div className={styles.shiftActions}>
          <Badge variant="ok">
            {signup.hoursLogged != null ? `${signup.hoursLogged}h logged` : 'Completed'}
          </Badge>
        </div>
      );
    }

    if (signup.checkedIn) {
      return (
        <div className={styles.shiftActions}>
          <Badge variant="ok">Checked in</Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleCheckout(shift.id)}
            disabled={actionId === shift.id}
          >
            {actionId === shift.id ? '…' : 'Check out'}
          </Button>
        </div>
      );
    }

    if (!past) {
      return (
        <div className={styles.shiftActions}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleCheckIn(shift.id)}
            disabled={actionId === shift.id}
          >
            {actionId === shift.id ? '…' : 'Check in'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleCancel(shift.id)}
            disabled={actionId === shift.id}
          >
            Cancel
          </Button>
        </div>
      );
    }

    return <Badge variant="pending">Missed</Badge>;
  }

  function renderShiftCard(shift: VolunteerShift) {
    const filled = confirmedCount(shift);
    const pct = capacityPercent(shift);
    const waitlistCount = shift.signups.filter((s) => signupStatus(s) === 'waitlisted').length;

    return (
      <div key={shift.id} className={styles.shift}>
        <div className={styles.shiftMain}>
          <strong>{shift.title}</strong>
          <p className="tms-t3">
            {formatShortDate(shift.date)} · {shiftHours(shift)}
            {shift.eventName ? ` · ${shift.eventName}` : ''}
          </p>
          <div className={styles.shiftMeta}>
            {shift.role && <Badge variant="info">{ROLE_LABELS[shift.role]}</Badge>}
            {shift.category && <Badge variant="pending">{CATEGORY_LABELS[shift.category]}</Badge>}
            {shift.location && <Badge variant="pending">{shift.location}</Badge>}
            {shift.isRecurringTemplate && <Badge variant="info">Weekly seva</Badge>}
            {shift.coordinator && (
              <span className="tms-t3">Coord: {shift.coordinator}</span>
            )}
          </div>
          {shift.description && (
            <p className={`tms-t3 ${styles.shiftDesc}`}>{shift.description}</p>
          )}
          <div className={styles.capacity}>
            <span className={`tms-t3 ${styles.capacityLabel}`}>
              {filled}/{shift.slots} filled
              {waitlistCount > 0 ? ` · ${waitlistCount} waitlisted` : ''}
            </span>
            <ProgressBar value={pct} color={pct >= 100 ? 'amber' : 'blue'} />
          </div>
        </div>
        {renderShiftActions(shift)}
      </div>
    );
  }

  function renderOpportunity(opp: VolunteerOpportunity) {
    const pct =
      opp.slotsTotal > 0 ? Math.round((opp.slotsFilled / opp.slotsTotal) * 100) : 0;
    return (
      <div key={opp.eventId} className={styles.eventRow}>
        <div className={styles.oppHeader}>
          <strong>{opp.eventName}</strong>
          <Badge variant="info">{CATEGORY_LABELS[opp.category]}</Badge>
        </div>
        <p className="tms-t3">
          {formatShortDate(opp.startDate)}
          {opp.startDate !== opp.endDate ? ` – ${formatShortDate(opp.endDate)}` : ''}
          {' · '}
          {opp.slotsRemaining} slots open across {opp.shiftsOpen} shifts
        </p>
        <ProgressBar value={pct} color="amber" />
        {opp.roles.length > 0 && (
          <div className={styles.roleChips}>
            {opp.roles.map((r) => (
              <Badge key={r.role} variant="pending">
                {ROLE_LABELS[r.role]} ×{r.slotsNeeded}
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  const loading =
    oppLoading || shiftsLoading || statsLoading || notifLoading || templatesLoading || prefsLoading;
  const error = oppError ?? shiftsError ?? statsError ?? notifError;

  const badgeLabel = stats ? BADGE_LABELS[stats.badgeTier] : '—';
  const recognitionDetail = stats?.nextBadgeAtHours
    ? `${badgeLabel} seva badge · Next: ${stats.nextBadgeAtHours} hours`
    : `${badgeLabel} seva badge · Top tier reached`;

  return (
    <>
      <PageIntro
        subtitle="Discover seva opportunities, sign up for shifts, and track your hours"
        showTenantContext={false}
      />
      <ApiBanner loading={loading} error={error} />

      <div className={styles.stats}>
        <StatTile
          compact
          accent="blue"
          label="Hours this quarter"
          value={stats ? String(stats.hoursThisQuarter) : '—'}
          icon="⏱️"
        />
        <StatTile
          compact
          accent="amber"
          label="Upcoming shifts"
          value={stats ? String(stats.upcomingShifts) : '—'}
          icon="📅"
        />
        <StatTile
          compact
          accent="green"
          label="Badge tier"
          value={badgeLabel}
          icon="🌟"
          change={stats ? `${stats.completedShifts} completed` : undefined}
        />
        <StatTile
          compact
          accent="blue"
          label="Waitlisted"
          value={stats ? String(stats.waitlistedShifts) : '—'}
          icon="⏳"
        />
      </div>

      <div className={styles.categoryBar}>
        <span className="tms-t3">Filter by seva type:</span>
        {(
          ['all', 'festival', 'pooja', 'annadanam', 'setup', 'cultural', 'general'] as const
        ).map((cat) => (
          <Button
            key={cat}
            size="sm"
            variant={categoryFilter === cat ? 'primary' : 'outline'}
            onClick={() => setCategoryFilter(cat)}
          >
            {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
          </Button>
        ))}
      </div>

      <GlassCard title="My preferences" className="mb2">
        <Button size="sm" variant="outline" onClick={() => setShowPreferences((v) => !v)}>
          {showPreferences ? 'Hide preferences' : 'Show preferences'}
        </Button>
        {showPreferences && (
          <div className={`${styles.formGrid} mt1`}>
            <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
              <label>Seva categories</label>
              <div className={styles.roleChips}>
                {(Object.keys(CATEGORY_LABELS) as VolunteerCategory[]).map((cat) => (
                  <label key={cat} className="flexRow" style={{ gap: '0.35rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={prefsForm.categories.includes(cat)}
                      onChange={() => toggleCategory(cat)}
                    />
                    {CATEGORY_LABELS[cat]}
                  </label>
                ))}
              </div>
            </div>
            <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
              <label>Preferred roles</label>
              <div className={styles.roleChips}>
                {(Object.keys(ROLE_LABELS) as VolunteerShiftRole[]).map((role) => (
                  <label key={role} className="flexRow" style={{ gap: '0.35rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={prefsForm.roles.includes(role)}
                      onChange={() => toggleRole(role)}
                    />
                    {ROLE_LABELS[role]}
                  </label>
                ))}
              </div>
            </div>
            <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
              <label className="flexRow" style={{ gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={prefsForm.notifyNewOpportunities}
                  onChange={(e) =>
                    setPrefsForm({ ...prefsForm, notifyNewOpportunities: e.target.checked })
                  }
                />
                Notify me about new volunteer opportunities
              </label>
            </div>
            <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
              <Button onClick={handleSavePreferences} disabled={prefsSaving}>
                {prefsSaving ? 'Saving…' : 'Save preferences'}
              </Button>
              {prefsMsg && <p className="tms-t3 mt1">{prefsMsg}</p>}
            </div>
          </div>
        )}
      </GlassCard>

      <div className={styles.grid}>
        <GlassCard title="Shifts">
          <div className={styles.tabs}>
            {(
              [
                ['all', 'All'],
                ['open', 'Open'],
                ['my', 'My shifts'],
                ['waitlist', 'Waitlist'],
                ['past', 'Past'],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant={filter === key ? 'primary' : 'outline'}
                onClick={() => setFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>
          {visibleShifts.length === 0 ? (
            <p className={`tms-t3 ${styles.emptyState}`}>
              {filter === 'open'
                ? 'No open shifts right now.'
                : filter === 'my'
                  ? 'You have no upcoming shifts.'
                  : filter === 'waitlist'
                    ? 'You are not on any waitlists.'
                    : filter === 'past'
                      ? 'No past shifts on record.'
                      : 'No shifts scheduled yet.'}
            </p>
          ) : (
            <div className={styles.shifts}>{visibleShifts.map(renderShiftCard)}</div>
          )}
          {(actionMsg || actionError) && (
            <p
              className="tms-t3 mt1"
              style={actionError ? { color: 'var(--red)' } : undefined}
            >
              {actionError ?? actionMsg}
            </p>
          )}
        </GlassCard>

        <GlassCard title="Upcoming Events Needing Volunteers">
          {opportunities.length === 0 ? (
            <p className={`tms-t3 ${styles.emptyState}`}>
              No confirmed events with volunteer needs right now.
            </p>
          ) : (
            opportunities.map(renderOpportunity)
          )}
        </GlassCard>

        <GlassCard
          title="Notifications"
          headerRight={
            unreadCount > 0 ? (
              <Badge variant="info">{unreadCount} new</Badge>
            ) : undefined
          }
        >
          {notifications.length === 0 ? (
            <p className={`tms-t3 ${styles.emptyState}`}>
              Sign up for shifts to receive confirmations and reminders here.
            </p>
          ) : (
            <div className={styles.notifications}>
              {notifications.slice(0, 8).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={[styles.notifItem, n.read ? styles.notifRead : ''].join(' ')}
                  onClick={() => handleMarkRead(n)}
                >
                  <strong>{n.title}</strong>
                  <span className="tms-t3">{n.body}</span>
                </button>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard title="Recognition">
          {stats ? (
            <>
              <p className="tms-t2">🌟 {stats.hoursThisQuarter} hours logged this quarter</p>
              <p className="tms-t3">{recognitionDetail}</p>
              <ProgressBar
                value={stats.progressToNextBadge}
                color={stats.badgeTier === 'platinum' ? 'green' : 'silver'}
                className="mt1"
              />
              <p className="tms-t3 mt1">{stats.hoursYtd} hours year-to-date</p>
            </>
          ) : (
            <p className="tms-t3">Loading recognition stats…</p>
          )}
        </GlassCard>

        {templates.length > 0 && (
          <GlassCard title="Weekly Seva Templates" className={styles.fullWidth}>
            <p className={`tms-t3 ${styles.emptyState}`}>
              Recurring seva slots — sign up each week for ongoing annadanam and pooja support.
            </p>
            <div className={styles.shifts}>
              {templates.map(renderShiftCard)}
            </div>
          </GlassCard>
        )}
      </div>

      {isAdmin && (
        <GlassCard title="Create shift" className={`${styles.mt1} ${styles.mb2}`}>
          <Button size="sm" variant="outline" onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? 'Hide form' : 'Show form'}
          </Button>
          {showCreate && (
            <div className={`${styles.formGrid} mt1`}>
              <div className="formGroup">
                <label>Title</label>
                <input
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label>Event name</label>
                <input
                  value={createForm.eventName ?? ''}
                  onChange={(e) => setCreateForm({ ...createForm, eventName: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label>Date</label>
                <input
                  type="date"
                  value={createForm.date}
                  onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label>Role</label>
                <select
                  value={createForm.role ?? 'general'}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      role: e.target.value as VolunteerShiftRole,
                    })
                  }
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="formGroup">
                <label>Start time</label>
                <input
                  value={createForm.startTime}
                  onChange={(e) => setCreateForm({ ...createForm, startTime: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label>End time</label>
                <input
                  value={createForm.endTime}
                  onChange={(e) => setCreateForm({ ...createForm, endTime: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label>Slots</label>
                <input
                  type="number"
                  min={1}
                  value={createForm.slots}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, slots: Number(e.target.value) || 1 })
                  }
                />
              </div>
              <div className="formGroup">
                <label>Location</label>
                <input
                  value={createForm.location ?? ''}
                  onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label>Coordinator</label>
                <input
                  value={createForm.coordinator ?? ''}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, coordinator: e.target.value })
                  }
                />
              </div>
              <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
                <label>Description</label>
                <input
                  value={createForm.description ?? ''}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, description: e.target.value })
                  }
                />
              </div>
              <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
                <Button onClick={handleCreate} disabled={creating || !createForm.title.trim()}>
                  {creating ? 'Creating…' : 'Create shift'}
                </Button>
              </div>
            </div>
          )}
        </GlassCard>
      )}
    </>
  );
}
