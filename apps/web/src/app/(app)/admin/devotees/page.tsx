'use client';

import { useState } from 'react';
import {
  Badge,
  Button,
  DataTable,
  GlassCard,
  PageHeader,
  StatTile,
} from '@tms/ui';
import { useTenant } from '@/lib/tenant-context';
import { createEndpoints } from '@/lib/api/endpoints';
import { useApi } from '@/lib/api/use-api';
import { ApiBanner } from '@/components/ApiBanner';
import styles from './devotees.module.css';

const FALLBACK = [
  {
    id: '1',
    name: 'Rajan Krishnamurthy',
    phone: '+1 408-555-0101',
    gotram: 'Bharadwaja',
    nakshatra: 'Rohini',
    tier: 'Gold',
    status: 'active' as const,
  },
];

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  country: 'US',
  gotram: '',
  nakshatra: '',
  rashi: '',
  gender: '' as '' | 'male' | 'female' | 'other',
  dateOfBirth: '',
  familyId: '',
  taxId: '',
  isNri: false,
  addressLine1: '',
  city: '',
};

export default function DevoteesPage() {
  const { api } = useTenant();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [dupWarning, setDupWarning] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApi(
    (ep) => ep.getDevotees({ limit: 50, name: search || undefined }),
    [search],
  );

  const rows =
    data?.data && !error
      ? data.data.map((d) => ({
          id: d.id,
          name: `${d.firstName} ${d.lastName}`,
          phone: d.phone,
          gotram: d.gotram ?? '—',
          nakshatra: d.nakshatra ?? '—',
          tier: d.membershipTier ?? 'Member',
          status: d.status,
        }))
      : FALLBACK;

  async function checkDuplicate(phone: string, email?: string) {
    if (!phone && !email) return;
    try {
      const ep = createEndpoints(api);
      const dup = await ep.checkDevoteeDuplicate({ phone, email });
      const parts: string[] = [];
      if (dup.phoneMatch) {
        parts.push(`Phone matches ${dup.phoneMatch.firstName} ${dup.phoneMatch.lastName}`);
      }
      if (dup.emailMatch) {
        parts.push(`Email matches ${dup.emailMatch.firstName} ${dup.emailMatch.lastName}`);
      }
      setDupWarning(parts.length ? parts.join(' · ') : null);
    } catch {
      setDupWarning(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormMsg(null);
    try {
      const ep = createEndpoints(api);
      await ep.createDevotee({
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        country: form.country,
        email: form.email || undefined,
        gotram: form.gotram || undefined,
        nakshatra: form.nakshatra || undefined,
        rashi: form.rashi || undefined,
        gender: form.gender || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        familyId: form.familyId || undefined,
        taxId: form.taxId || undefined,
        isNri: form.isNri,
        address: form.addressLine1
          ? { line1: form.addressLine1, city: form.city, country: form.country }
          : undefined,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      refetch();
      setFormMsg('Devotee created.');
    } catch (err) {
      setFormMsg(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Devotee CRM"
        subtitle="Industry-standard profile: name, contacts, gotram, nakshatra for ritual sankalpa"
        actions={
          <>
            <Button variant="outline" onClick={() => refetch()}>
              Refresh
            </Button>
            <Button onClick={() => setShowForm((v) => !v)}>
              {showForm ? 'Cancel' : '+ Walk-in devotee'}
            </Button>
          </>
        }
      />
      <ApiBanner loading={loading} error={error} />

      {showForm && (
        <GlassCard title="Register walk-in devotee" className="mb2">
          <form onSubmit={handleCreate} className="formGrid">
            <div className="formGroup">
              <label htmlFor="firstName">First name *</label>
              <input
                id="firstName"
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </div>
            <div className="formGroup">
              <label htmlFor="lastName">Last name *</label>
              <input
                id="lastName"
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
            <div className="formGroup">
              <label htmlFor="phone">Phone *</label>
              <input
                id="phone"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                onBlur={() => checkDuplicate(form.phone, form.email)}
              />
            </div>
            <div className="formGroup">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="formGroup">
              <label htmlFor="country">Country *</label>
              <input
                id="country"
                required
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>
            <div className="formGroup">
              <label htmlFor="gotram">Gotram</label>
              <input
                id="gotram"
                value={form.gotram}
                onChange={(e) => setForm({ ...form, gotram: e.target.value })}
              />
            </div>
            <div className="formGroup">
              <label htmlFor="nakshatra">Nakshatra</label>
              <input
                id="nakshatra"
                value={form.nakshatra}
                onChange={(e) => setForm({ ...form, nakshatra: e.target.value })}
              />
            </div>
            <div className="formGroup">
              <label htmlFor="rashi">Rashi</label>
              <input id="rashi" value={form.rashi} onChange={(e) => setForm({ ...form, rashi: e.target.value })} />
            </div>
            <div className="formGroup">
              <label htmlFor="gender">Gender</label>
              <select id="gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as typeof form.gender })}>
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
              <label htmlFor="familyId">Family ID</label>
              <input id="familyId" value={form.familyId} onChange={(e) => setForm({ ...form, familyId: e.target.value })} />
            </div>
            <div className="formGroup">
              <label htmlFor="taxId">Tax ID</label>
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
                <input type="checkbox" checked={form.isNri} onChange={(e) => setForm({ ...form, isNri: e.target.checked })} /> NRI
              </label>
            </div>
            {dupWarning && (
              <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
                <p className="tms-t2" style={{ color: 'var(--amber)' }}>⚠ {dupWarning}</p>
              </div>
            )}
            <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Create devotee'}
              </Button>
              {formMsg && <p className="tms-t2 mt1">{formMsg}</p>}
            </div>
          </form>
        </GlassCard>
      )}

      <div className={`${styles.stats} mb2`}>
        <StatTile label="Total Members" value={String(data?.meta.total ?? rows.length)} icon="👥" />
        <StatTile label="Active" value={String(rows.filter((r) => r.status === 'active').length)} icon="✅" />
        <StatTile label="Renewal Due" value="3" icon="📅" change="This month" />
      </div>

      <GlassCard
        title="Devotee Directory"
        headerRight={
          <input
            className={styles.search}
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        }
        noBodyPadding
      >
        <DataTable
          getRowKey={(row) => row.id}
          columns={[
            { key: 'name', header: 'Name', render: (row) => row.name },
            { key: 'phone', header: 'Phone', render: (row) => row.phone },
            { key: 'gotram', header: 'Gotram', render: (row) => row.gotram },
            { key: 'nakshatra', header: 'Nakshatra', render: (row) => row.nakshatra },
            { key: 'tier', header: 'Tier', render: (row) => row.tier },
            {
              key: 'status',
              header: 'Status',
              render: (row) => (
                <Badge variant={row.status === 'active' ? 'ok' : 'pending'}>
                  {row.status}
                </Badge>
              ),
            },
          ]}
          data={rows}
        />
      </GlassCard>
    </>
  );
}
