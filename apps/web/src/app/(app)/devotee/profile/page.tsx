'use client';

import { useEffect, useState } from 'react';
import { Button, GlassCard, PageHeader } from '@tms/ui';
import type { Devotee, DevoteeGender, ImportantDate, ImportantDateType } from '@tms/types';
import { useAuth } from '@/lib/auth-context';
import { useTenant } from '@/lib/tenant-context';
import { createEndpoints } from '@/lib/api/endpoints';
import { ApiBanner } from '@/components/ApiBanner';

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'kn', label: 'Kannada' },
];

const EMPTY = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  country: 'US',
  gotram: '',
  nakshatra: '',
  rashi: '',
  gender: '' as DevoteeGender | '',
  dateOfBirth: '',
  photoUrl: '',
  familyId: '',
  taxId: '',
  isNri: false,
  communicationOptIn: true,
  preferredLanguage: 'en',
  membershipTier: '',
  addressLine1: '',
  city: '',
  state: '',
  postalCode: '',
};

export default function DevoteeProfilePage() {
  const { user } = useAuth();
  const { api } = useTenant();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [importantDates, setImportantDates] = useState<ImportantDate[]>([]);

  useEffect(() => {
    if (!user?.devoteeId) {
      setLoading(false);
      return;
    }
    const ep = createEndpoints(api);
    ep.getDevotee(user.devoteeId)
      .then((d: Devotee) => {
        setForm({
          firstName: d.firstName,
          lastName: d.lastName,
          phone: d.phone,
          email: d.email ?? '',
          country: d.country,
          gotram: d.gotram ?? '',
          nakshatra: d.nakshatra ?? '',
          rashi: d.rashi ?? '',
          gender: d.gender ?? '',
          dateOfBirth: d.dateOfBirth ?? '',
          photoUrl: d.photoUrl ?? '',
          familyId: d.familyId ?? '',
          taxId: d.taxId ?? '',
          membershipTier: d.membershipTier ?? '',
          isNri: d.isNri ?? false,
          communicationOptIn: d.communicationOptIn ?? true,
          preferredLanguage: d.preferredLanguage ?? 'en',
          addressLine1: d.address?.line1 ?? '',
          city: d.address?.city ?? '',
          state: d.address?.state ?? '',
          postalCode: d.address?.postalCode ?? '',
        });
        setImportantDates(d.importantDates ?? []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [api, user?.devoteeId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.devoteeId) return;
    setSaving(true);
    setMessage(null);
    try {
      const ep = createEndpoints(api);
      await ep.updateDevotee(user.devoteeId, {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        email: form.email || undefined,
        country: form.country,
        gotram: form.gotram || undefined,
        nakshatra: form.nakshatra || undefined,
        rashi: form.rashi || undefined,
        gender: form.gender || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        photoUrl: form.photoUrl || undefined,
        familyId: form.familyId || undefined,
        taxId: form.taxId || undefined,
        isNri: form.isNri,
        communicationOptIn: form.communicationOptIn,
        preferredLanguage: form.preferredLanguage,
        address: form.addressLine1
          ? {
              line1: form.addressLine1,
              city: form.city,
              state: form.state,
              postalCode: form.postalCode,
              country: form.country,
            }
          : undefined,
        importantDates: importantDates.filter((d) => d.label && d.date),
      });
      setMessage('Profile saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!user?.devoteeId) {
    return (
      <>
        <PageHeader title="My Profile" subtitle="Devotee self-service" />
        <p className="tms-t2">No devotee profile linked to your login.</p>
      </>
    );
  }

  return (
    <>
      <PageHeader title="My Profile" subtitle="Update ritual details, address, and tax ID for receipts" />
      <ApiBanner loading={loading} error={error} />

      <GlassCard title="Profile">
        <form onSubmit={handleSave} className="formGrid">
          {form.photoUrl && (
            <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
              <img
                src={form.photoUrl}
                alt="Profile"
                style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }}
              />
            </div>
          )}
          <div className="formGroup">
            <label htmlFor="photoUrl">Photo URL</label>
            <input
              id="photoUrl"
              type="url"
              value={form.photoUrl}
              onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
              placeholder="https://…"
            />
          </div>
          {form.membershipTier && (
            <div className="formGroup">
              <label>Membership tier</label>
              <input value={form.membershipTier} readOnly disabled />
            </div>
          )}
          <div className="formGroup">
            <label htmlFor="firstName">First name</label>
            <input id="firstName" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          </div>
          <div className="formGroup">
            <label htmlFor="lastName">Last name</label>
            <input id="lastName" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <div className="formGroup">
            <label htmlFor="phone">Phone</label>
            <input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="formGroup">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="formGroup">
            <label htmlFor="gotram">Gotram</label>
            <input id="gotram" value={form.gotram} onChange={(e) => setForm({ ...form, gotram: e.target.value })} />
          </div>
          <div className="formGroup">
            <label htmlFor="nakshatra">Nakshatra</label>
            <input id="nakshatra" value={form.nakshatra} onChange={(e) => setForm({ ...form, nakshatra: e.target.value })} />
          </div>
          <div className="formGroup">
            <label htmlFor="rashi">Rashi</label>
            <input id="rashi" value={form.rashi} onChange={(e) => setForm({ ...form, rashi: e.target.value })} />
          </div>
          <div className="formGroup">
            <label htmlFor="gender">Gender</label>
            <select id="gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as DevoteeGender })}>
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="formGroup">
            <label htmlFor="dob">Date of birth</label>
            <input id="dob" type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
          </div>
          <div className="formGroup">
            <label htmlFor="familyId">Family / household ID</label>
            <input id="familyId" value={form.familyId} onChange={(e) => setForm({ ...form, familyId: e.target.value })} placeholder="Link to family profile" />
          </div>
          <div className="formGroup">
            <label htmlFor="taxId">Tax ID (PAN / SSN / SIN)</label>
            <input id="taxId" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
          </div>
          <div className="formGroup">
            <label htmlFor="address">Address</label>
            <input id="address" value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} />
          </div>
          <div className="formGroup">
            <label htmlFor="city">City</label>
            <input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div className="formGroup">
            <label>
              <input type="checkbox" checked={form.isNri} onChange={(e) => setForm({ ...form, isNri: e.target.checked })} /> NRI / overseas
            </label>
          </div>
          <div className="formGroup">
            <label>
              <input type="checkbox" checked={form.communicationOptIn} onChange={(e) => setForm({ ...form, communicationOptIn: e.target.checked })} /> Email/SMS updates
            </label>
          </div>
          <div className="formGroup">
            <label htmlFor="preferredLanguage">Preferred language</label>
            <select
              id="preferredLanguage"
              value={form.preferredLanguage}
              onChange={(e) => setForm({ ...form, preferredLanguage: e.target.value })}
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
            <h3 className="tms-t1">Important dates</h3>
            <p className="tms-t3">
              Birthdays, anniversaries, and star days for personalised reminders.
              Add a <strong>star day</strong> entry (type: Star day) to receive nakshatra archana reminders before your star day each month.
            </p>
          </div>
          {importantDates.map((row, index) => (
            <div key={index} className="formGrid" style={{ gridColumn: '1 / -1' }}>
              <div className="formGroup">
                <label htmlFor={`date-label-${index}`}>Label</label>
                <input
                  id={`date-label-${index}`}
                  value={row.label}
                  onChange={(e) => {
                    const next = [...importantDates];
                    next[index] = { ...row, label: e.target.value };
                    setImportantDates(next);
                  }}
                  placeholder="Spouse birthday"
                />
              </div>
              <div className="formGroup">
                <label htmlFor={`date-value-${index}`}>Date</label>
                <input
                  id={`date-value-${index}`}
                  type="date"
                  value={row.date}
                  onChange={(e) => {
                    const next = [...importantDates];
                    next[index] = { ...row, date: e.target.value };
                    setImportantDates(next);
                  }}
                />
              </div>
              <div className="formGroup">
                <label htmlFor={`date-type-${index}`}>Type</label>
                <select
                  id={`date-type-${index}`}
                  value={row.type}
                  onChange={(e) => {
                    const next = [...importantDates];
                    next[index] = { ...row, type: e.target.value as ImportantDateType };
                    setImportantDates(next);
                  }}
                >
                  <option value="birthday">Birthday</option>
                  <option value="anniversary">Anniversary</option>
                  <option value="star_day">Star day (nakshatra reminder)</option>
                  <option value="other">Other</option>
                </select>
                {row.type === 'star_day' && (
                  <p className="tms-t3 mt1">⭐ We&apos;ll remind you to book archana before this star day.</p>
                )}
              </div>
              <div className="formGroup" style={{ alignSelf: 'end' }}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setImportantDates(importantDates.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
          <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setImportantDates([...importantDates, { label: '', date: '', type: 'birthday' }])
              }
            >
              + Add date
            </Button>
          </div>

          <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</Button>
            {message && <p className="tms-t2 mt1">{message}</p>}
          </div>
        </form>
      </GlassCard>
    </>
  );
}
