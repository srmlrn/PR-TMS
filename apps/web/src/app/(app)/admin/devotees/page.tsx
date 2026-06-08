'use client';

import { useState } from 'react';
import {
  Badge,
  Button,
  DataTable,
  GlassCard,
  StatTile,
} from '@tms/ui';
import { useTenant } from '@/lib/tenant-context';
import { createEndpoints } from '@/lib/api/endpoints';
import { useApi } from '@/lib/api/use-api';
import { PageIntro } from '@/components/AppPage';
import { ApiBanner } from '@/components/ApiBanner';
import { PersonRow } from '@/components/PersonAvatar';
import { DevoteeContactFields } from '@/components/DevoteeContactFields';
import {
  contactFormToApiFields,
  devoteeToContactForm,
  EMPTY_CONTACT_FORM,
  type DevoteeContactFormValue,
} from '@/lib/devotee-contacts';
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

type DevoteeFormState = {
  firstName: string;
  lastName: string;
  country: string;
  gotram: string;
  nakshatra: string;
  rashi: string;
  gender: '' | 'male' | 'female' | 'other';
  dateOfBirth: string;
  familyId: string;
  taxId: string;
  isNri: boolean;
  photoUrl: string;
  status: 'active' | 'inactive' | 'renewal_due';
  membershipTier: string;
  membershipExpiresAt: string;
  contacts: DevoteeContactFormValue;
};

const EMPTY_FORM: DevoteeFormState = {
  firstName: '',
  lastName: '',
  country: 'US',
  gotram: '',
  nakshatra: '',
  rashi: '',
  gender: '',
  dateOfBirth: '',
  familyId: '',
  taxId: '',
  isNri: false,
  photoUrl: '',
  status: 'active',
  membershipTier: 'Member',
  membershipExpiresAt: '',
  contacts: { ...EMPTY_CONTACT_FORM },
};

export default function DevoteesPage() {
  const { api } = useTenant();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [dupWarning, setDupWarning] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<DevoteeFormState>(EMPTY_FORM);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState<string | null>(null);

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

  async function checkDuplicate(contacts: DevoteeContactFormValue) {
    const fields = contactFormToApiFields(contacts);
    if (!fields.phone && !fields.email) return;
    try {
      const ep = createEndpoints(api);
      const dup = await ep.checkDevoteeDuplicate({ phone: fields.phone, email: fields.email });
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

  async function openEdit(id: string) {
    setEditingId(id);
    setEditLoading(true);
    setEditMsg(null);
    try {
      const ep = createEndpoints(api);
      const d = await ep.getDevotee(id);
      const contacts = devoteeToContactForm(d);
      setEditForm({
        firstName: d.firstName,
        lastName: d.lastName,
        country: d.country,
        gotram: d.gotram ?? '',
        nakshatra: d.nakshatra ?? '',
        rashi: d.rashi ?? '',
        gender: d.gender ?? '',
        dateOfBirth: d.dateOfBirth ?? '',
        familyId: d.familyId ?? '',
        taxId: d.taxId ?? '',
        isNri: d.isNri ?? false,
        photoUrl: d.photoUrl ?? '',
        status: d.status,
        membershipTier: d.membershipTier ?? 'Member',
        membershipExpiresAt: d.membershipExpiresAt
          ? new Date(d.membershipExpiresAt).toISOString().slice(0, 10)
          : '',
        contacts: { ...contacts, country: d.country },
      });
    } catch (err) {
      setEditMsg(err instanceof Error ? err.message : 'Failed to load devotee');
    } finally {
      setEditLoading(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditSaving(true);
    setEditMsg(null);
    try {
      const ep = createEndpoints(api);
      const contactFields = contactFormToApiFields({
        ...editForm.contacts,
        country: editForm.country,
      });
      await ep.updateDevotee(editingId, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        country: editForm.country,
        gotram: editForm.gotram || undefined,
        nakshatra: editForm.nakshatra || undefined,
        rashi: editForm.rashi || undefined,
        gender: editForm.gender || undefined,
        dateOfBirth: editForm.dateOfBirth || undefined,
        familyId: editForm.familyId || undefined,
        taxId: editForm.taxId || undefined,
        isNri: editForm.isNri,
        photoUrl: editForm.photoUrl || undefined,
        status: editForm.status,
        membershipTier: editForm.membershipTier,
        membershipExpiresAt: editForm.membershipExpiresAt || undefined,
        ...contactFields,
      });
      setEditingId(null);
      refetch();
      setEditMsg('Devotee updated.');
    } catch (err) {
      setEditMsg(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormMsg(null);
    try {
      const ep = createEndpoints(api);
      const contactFields = contactFormToApiFields({
        ...form.contacts,
        country: form.country,
      });
      await ep.createDevotee({
        firstName: form.firstName,
        lastName: form.lastName,
        country: form.country,
        gotram: form.gotram || undefined,
        nakshatra: form.nakshatra || undefined,
        rashi: form.rashi || undefined,
        gender: form.gender || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        familyId: form.familyId || undefined,
        taxId: form.taxId || undefined,
        isNri: form.isNri,
        ...contactFields,
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
      <PageIntro
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
        showTenantContext={false}
      />
      <ApiBanner loading={loading} error={error} />

      {editingId && (
        <GlassCard
          title={`Edit devotee${editLoading ? '…' : ''}`}
          className="mb2"
          headerRight={
            <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
              Close
            </Button>
          }
        >
          {editLoading ? (
            <p className="tms-t2">Loading profile…</p>
          ) : (
            <form onSubmit={handleUpdate} className="formGrid">
              <div className="formGroup">
                <label htmlFor="edit-firstName">First name *</label>
                <input id="edit-firstName" required value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
              </div>
              <div className="formGroup">
                <label htmlFor="edit-lastName">Last name *</label>
                <input id="edit-lastName" required value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
              </div>
              <div className="formGroup">
                <label htmlFor="edit-country">Country *</label>
                <input
                  id="edit-country"
                  required
                  value={editForm.country}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      country: e.target.value,
                      contacts: { ...editForm.contacts, country: e.target.value },
                    })
                  }
                />
              </div>
              <DevoteeContactFields
                idPrefix="edit"
                value={editForm.contacts}
                onChange={(contacts) => setEditForm({ ...editForm, contacts })}
              />
              <div className="formGroup">
                <label htmlFor="edit-gotram">Gotram</label>
                <input id="edit-gotram" value={editForm.gotram} onChange={(e) => setEditForm({ ...editForm, gotram: e.target.value })} />
              </div>
              <div className="formGroup">
                <label htmlFor="edit-nakshatra">Nakshatra</label>
                <input id="edit-nakshatra" value={editForm.nakshatra} onChange={(e) => setEditForm({ ...editForm, nakshatra: e.target.value })} />
              </div>
              <div className="formGroup">
                <label htmlFor="edit-rashi">Rashi</label>
                <input id="edit-rashi" value={editForm.rashi} onChange={(e) => setEditForm({ ...editForm, rashi: e.target.value })} />
              </div>
              <div className="formGroup">
                <label htmlFor="edit-gender">Gender</label>
                <select id="edit-gender" value={editForm.gender} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value as DevoteeFormState['gender'] })}>
                  <option value="">—</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="formGroup">
                <label htmlFor="edit-dob">Date of birth</label>
                <input id="edit-dob" type="date" value={editForm.dateOfBirth} onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })} />
              </div>
              <div className="formGroup">
                <label htmlFor="edit-familyId">Family ID</label>
                <input id="edit-familyId" value={editForm.familyId} onChange={(e) => setEditForm({ ...editForm, familyId: e.target.value })} />
              </div>
              <div className="formGroup">
                <label htmlFor="edit-taxId">Tax ID</label>
                <input id="edit-taxId" value={editForm.taxId} onChange={(e) => setEditForm({ ...editForm, taxId: e.target.value })} />
              </div>
              <div className="formGroup">
                <label htmlFor="edit-status">Status</label>
                <select id="edit-status" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as DevoteeFormState['status'] })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="renewal_due">Renewal due</option>
                </select>
              </div>
              <div className="formGroup">
                <label htmlFor="edit-tier">Membership tier</label>
                <select
                  id="edit-tier"
                  value={editForm.membershipTier}
                  onChange={(e) => setEditForm({ ...editForm, membershipTier: e.target.value })}
                >
                  <option value="Member">Member</option>
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                  <option value="Patron">Patron</option>
                </select>
              </div>
              <div className="formGroup">
                <label htmlFor="edit-membership-expiry">Membership expires</label>
                <input
                  id="edit-membership-expiry"
                  type="date"
                  value={editForm.membershipExpiresAt}
                  onChange={(e) => setEditForm({ ...editForm, membershipExpiresAt: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label htmlFor="edit-photoUrl">Photo URL</label>
                <input
                  id="edit-photoUrl"
                  type="url"
                  value={editForm.photoUrl}
                  onChange={(e) => setEditForm({ ...editForm, photoUrl: e.target.value })}
                  placeholder="https://…"
                />
              </div>
              <div className="formGroup">
                <label>
                  <input type="checkbox" checked={editForm.isNri} onChange={(e) => setEditForm({ ...editForm, isNri: e.target.checked })} /> NRI
                </label>
              </div>
              <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
                <Button type="submit" disabled={editSaving}>
                  {editSaving ? 'Saving…' : 'Save changes'}
                </Button>
                {editMsg && <p className="tms-t2 mt1">{editMsg}</p>}
              </div>
            </form>
          )}
        </GlassCard>
      )}

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
              <label htmlFor="country">Country *</label>
              <input
                id="country"
                required
                value={form.country}
                onChange={(e) =>
                  setForm({
                    ...form,
                    country: e.target.value,
                    contacts: { ...form.contacts, country: e.target.value },
                  })
                }
              />
            </div>
            <DevoteeContactFields
              idPrefix="create"
              value={form.contacts}
              onChange={(contacts) => setForm({ ...form, contacts })}
            />
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
            {
              key: 'name',
              header: 'Name',
              render: (row) => (
                <PersonRow
                  name={row.name}
                  photoUrl={'photoUrl' in row ? String(row.photoUrl) : undefined}
                  subtitle={row.phone}
                />
              ),
            },
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
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (row) => (
                <Button size="sm" variant="outline" onClick={() => openEdit(row.id)}>
                  Edit
                </Button>
              ),
            },
          ]}
          data={rows}
        />
      </GlassCard>
    </>
  );
}
