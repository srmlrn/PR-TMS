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
};

export default function DevoteesPage() {
  const { api } = useTenant();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);

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
