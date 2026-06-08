'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Badge, Button, GlassCard } from '@tms/ui';
import type { Devotee, DevoteeGender } from '@tms/types';
import { useTenant } from '@/lib/tenant-context';
import { createEndpoints } from '@/lib/api/endpoints';
import { useApi } from '@/lib/api/use-api';
import { PageIntro } from '@/components/AppPage';
import { ApiBanner } from '@/components/ApiBanner';
import { PersonAvatar } from '@/components/PersonAvatar';
import { DevoteeProfilePanel } from '@/components/DevoteeProfilePanel';
import { CountryStateSelect } from '@/components/CountryStateSelect';
import { RitualSelect } from '@/components/RitualSelect';
import styles from './devotees.module.css';

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

type FormState = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  country: string;
  gotram: string;
  nakshatra: string;
  gender: '' | DevoteeGender;
  dateOfBirth: string;
  familyId: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  status: Devotee['status'];
  membershipTier: string;
};

const EMPTY_FORM: FormState = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  country: 'US',
  gotram: '',
  nakshatra: '',
  gender: '',
  dateOfBirth: '',
  familyId: '',
  addressLine1: '',
  city: '',
  state: '',
  postalCode: '',
  status: 'active',
  membershipTier: 'Member',
};

function devoteeToForm(d: Devotee): FormState {
  return {
    firstName: d.firstName,
    lastName: d.lastName,
    phone: d.phone,
    email: d.email ?? '',
    country: d.country,
    gotram: d.gotram ?? '',
    nakshatra: d.nakshatra ?? '',
    gender: d.gender ?? '',
    dateOfBirth: d.dateOfBirth ?? '',
    familyId: d.familyId ?? '',
    addressLine1: d.address?.line1 ?? '',
    city: d.address?.city ?? '',
    state: d.address?.state ?? '',
    postalCode: d.address?.postalCode ?? '',
    status: d.status,
    membershipTier: d.membershipTier ?? 'Member',
  };
}

function FrontDeskDevoteesPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { api } = useTenant();
  const ep = useMemo(() => createEndpoints(api), [api]);

  const [search, setSearch] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [letter, setLetter] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(params.get('id'));
  const [mode, setMode] = useState<'view' | 'edit' | 'create' | 'family'>(
    params.get('new') === '1' ? 'create' : 'view',
  );
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [familyForm, setFamilyForm] = useState({ firstName: '', lastName: '', phone: '', gotram: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [profileRefresh, setProfileRefresh] = useState(0);
  const [menuId, setMenuId] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApi(
    (endpoints) =>
      endpoints.getDevotees({
        limit: 100,
        name: search || undefined,
        phone: phoneSearch || undefined,
      }),
    [search, phoneSearch],
  );

  const { data: services } = useApi((endpoints) => endpoints.getServices());

  const familyById = useMemo(() => {
    const map = new Map<string, { id: string; name: string }[]>();
    for (const d of data?.data ?? []) {
      if (!d.familyId) continue;
      const members = map.get(d.familyId) ?? [];
      members.push({ id: d.id, name: `${d.firstName} ${d.lastName}` });
      map.set(d.familyId, members);
    }
    return map;
  }, [data]);

  const rows = useMemo(() => {
    let list = data?.data ?? [];
    if (letter) {
      list = list.filter((d) => d.lastName.toUpperCase().startsWith(letter));
    }
    if (activeOnly) {
      list = list.filter((d) => d.status === 'active');
    }
    return list.map((d) => {
      const familyNames =
        d.familyId && familyById.has(d.familyId)
          ? (familyById.get(d.familyId) ?? [])
              .filter((m) => m.id !== d.id)
              .map((m) => m.name)
          : [];

      return {
        id: d.id,
        name: `${d.firstName} ${d.lastName}`,
        phone: d.phone,
        gotram: d.gotram ?? '—',
        status: d.status,
        familyNames,
      };
    });
  }, [data, letter, activeOnly, familyById]);

  useEffect(() => {
    if (!menuId) return;
    function closeMenu() {
      setMenuId(null);
    }
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, [menuId]);

  const selectDevotee = useCallback(
    async (id: string) => {
      setSelectedId(id);
      setMode('view');
      setMessage(null);
      router.replace(`/frontdesk/devotees?id=${id}`, { scroll: false });
    },
    [router],
  );

  const loadEditForm = useCallback(
    async (id: string) => {
      setBusy(true);
      setMessage(null);
      try {
        const d = await ep.getDevotee(id);
        setForm(devoteeToForm(d));
        setMode('edit');
        router.replace(`/frontdesk/devotees?id=${id}`, { scroll: false });
      } catch (err) {
        setMode('view');
        router.replace(`/frontdesk/devotees?id=${id}`, { scroll: false });
        setMessage(err instanceof Error ? err.message : 'Failed to load devotee');
      } finally {
        setBusy(false);
      }
    },
    [ep, router],
  );

  useEffect(() => {
    if (params.get('new') === '1') {
      setMode('create');
      setForm(EMPTY_FORM);
      setSelectedId(null);
      return;
    }
    const id = params.get('id');
    if (!id) {
      setSelectedId(null);
      return;
    }
    setSelectedId(id);
    if (params.get('edit') === '1') {
      void loadEditForm(id);
      return;
    }
    setMode((current) =>
      current === 'edit' || current === 'family' ? current : 'view',
    );
  }, [params, loadEditForm]);

  async function openEditFor(id: string) {
    setSelectedId(id);
    router.replace(`/frontdesk/devotees?id=${id}&edit=1`, { scroll: false });
  }

  async function openEdit() {
    if (!selectedId) return;
    await openEditFor(selectedId);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const base = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        country: form.country,
        email: form.email || undefined,
        gotram: form.gotram || undefined,
        nakshatra: form.nakshatra || undefined,
        gender: form.gender || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        familyId: form.familyId || undefined,
        address: form.addressLine1
          ? {
              line1: form.addressLine1,
              city: form.city,
              state: form.state || undefined,
              postalCode: form.postalCode || undefined,
              country: form.country,
            }
          : undefined,
      };

      if (mode === 'create') {
        const created = await ep.createDevotee(base);
        await refetch();
        selectDevotee(created.id);
        setMessage('Devotee created.');
      } else if (mode === 'edit' && selectedId) {
        await ep.updateDevotee(selectedId, {
          ...base,
          status: form.status,
          membershipTier: form.membershipTier,
        });
        await refetch();
        setMode('view');
        router.replace(`/frontdesk/devotees?id=${selectedId}`, { scroll: false });
        setProfileRefresh((n) => n + 1);
        setMessage('Devotee updated.');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function deleteDevoteeFor(id: string, name: string) {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    setBusy(true);
    setMessage(null);
    try {
      await ep.deleteDevotee(id);
      if (selectedId === id) {
        setSelectedId(null);
        setMode('view');
        router.replace('/frontdesk/devotees', { scroll: false });
      }
      await refetch();
      setMessage('Devotee deleted.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!selectedId) return;
    const row = rows.find((r) => r.id === selectedId);
    await deleteDevoteeFor(selectedId, row?.name ?? 'this devotee');
  }

  async function handleAddFamilyMember(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setBusy(true);
    setMessage(null);
    try {
      const head = await ep.getDevotee(selectedId);
      let familyId = head.familyId;
      if (!familyId) {
        familyId = `fam-${head.lastName.toLowerCase().replace(/\s+/g, '-')}-${head.id.slice(-6)}`;
        await ep.updateDevotee(selectedId, { familyId });
      }
      const created = await ep.createDevotee({
        firstName: familyForm.firstName.trim(),
        lastName: familyForm.lastName.trim() || head.lastName,
        phone: familyForm.phone.trim(),
        country: head.country,
        gotram: familyForm.gotram || head.gotram,
        familyId,
      });
      setFamilyForm({ firstName: '', lastName: '', phone: '', gotram: '' });
      setMode('view');
      setProfileRefresh((n) => n + 1);
      await refetch();
      setMessage(`Family member added — ${created.firstName} ${created.lastName}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not add family member');
    } finally {
      setBusy(false);
    }
  }

  async function handleLookup() {
    if (!search.trim() && !phoneSearch.trim()) return;
    setBusy(true);
    try {
      const result = await ep.frontDeskLookup({
        name: search.trim() || undefined,
        phone: phoneSearch.trim() || undefined,
      });
      if (result.found && result.matches?.length) {
        await selectDevotee(result.matches[0].id);
      } else {
        setMessage('No devotee found — create a new record.');
        setSelectedId(null);
        setForm(EMPTY_FORM);
        setMode('create');
        router.replace('/frontdesk/devotees?new=1', { scroll: false });
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageIntro
        subtitle="Search · add · edit · family · seva & donation history"
        actions={
          <div className={styles.detailActions}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/frontdesk/console')}
            >
              Reception Console
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setMode('create');
                setForm(EMPTY_FORM);
                setSelectedId(null);
                router.replace('/frontdesk/devotees?new=1', { scroll: false });
              }}
            >
              + New devotee
            </Button>
          </div>
        }
        showTenantContext={false}
      />
      <ApiBanner loading={loading} error={error} />

      <div className={styles.toolbar}>
        <input
          className={styles.search}
          placeholder="Search name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          className={styles.search}
          placeholder="Phone…"
          value={phoneSearch}
          onChange={(e) => setPhoneSearch(e.target.value)}
        />
        <Button size="sm" variant="outline" onClick={handleLookup} disabled={busy}>
          Look up
        </Button>
        <label className="tms-t3" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
          />
          Active only
        </label>
      </div>

      {message && <p className="tms-t2 mb1">{message}</p>}

      <div className={styles.alphaRow}>
        <button
          type="button"
          className={`${styles.alphaBtn} ${letter === '' ? styles.alphaBtnActive : ''}`}
          onClick={() => setLetter('')}
        >
          All
        </button>
        {ALPHA.map((ch) => (
          <button
            key={ch}
            type="button"
            className={`${styles.alphaBtn} ${letter === ch ? styles.alphaBtnActive : ''}`}
            onClick={() => setLetter(ch)}
          >
            {ch}
          </button>
        ))}
      </div>

      <div className={styles.layout}>
        <GlassCard compact title="Directory" noBodyPadding className={styles.directoryCard}>
          {rows.length === 0 ? (
            <p className={styles.emptyDetail}>No devotees match your filters.</p>
          ) : (
            rows.map((row) => {
              return (
                <div
                  key={row.id}
                  className={[
                    styles.rowItem,
                    selectedId === row.id ? styles.rowItemActive : '',
                    menuId === row.id ? styles.rowItemMenuOpen : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <button
                    type="button"
                    className={styles.rowMain}
                    onClick={() => {
                      setMenuId(null);
                      selectDevotee(row.id);
                    }}
                  >
                    <PersonAvatar
                      name={row.name}
                      photoUrl={'photoUrl' in row ? String(row.photoUrl) : undefined}
                      size="sm"
                    />
                    <span className={styles.rowInfo}>
                      <span className={styles.rowNameLine}>
                        <strong>{row.name}</strong>
                        {row.status !== 'active' && <Badge variant="pending">{row.status}</Badge>}
                      </span>
                      <span className={styles.rowSub}>
                        {row.gotram}
                        {row.familyNames.length > 0 && ` · ${row.familyNames.join(', ')}`}
                      </span>
                    </span>
                    <span className={styles.rowPhone}>{row.phone}</span>
                  </button>
                  <div className={styles.rowQuick}>
                    <button
                      type="button"
                      className={`${styles.iconBtn} ${styles.iconBtnPrimary}`}
                      title="Book seva at counter"
                      disabled={busy}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuId(null);
                        router.push(`/frontdesk/console?devoteeId=${row.id}`);
                      }}
                    >
                      🙏
                    </button>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      title="Edit profile"
                      disabled={busy}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuId(null);
                        void openEditFor(row.id);
                      }}
                    >
                      ✎
                    </button>
                    <div className={styles.menuWrap}>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        title="More actions"
                        disabled={busy}
                        aria-expanded={menuId === row.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuId((current) => (current === row.id ? null : row.id));
                        }}
                      >
                        ⋯
                      </button>
                      {menuId === row.id && (
                        <div className={styles.menuPanel} role="menu">
                          <button
                            type="button"
                            role="menuitem"
                            className={styles.menuItem}
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuId(null);
                              void selectDevotee(row.id);
                            }}
                          >
                            View profile
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className={styles.menuItem}
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuId(null);
                              router.push(`/frontdesk/console?devoteeId=${row.id}`);
                            }}
                          >
                            Book seva
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className={`${styles.menuItem} ${styles.menuItemDanger}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuId(null);
                              void deleteDevoteeFor(row.id, row.name);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </GlassCard>

        <GlassCard
          compact
          title={
            mode === 'create' ? 'New devotee' : mode === 'edit' ? 'Edit devotee' : 'Devotee record'
          }
          bodyClassName={styles.formCardBody}
        >
          {mode === 'create' || mode === 'edit' ? (
            <form onSubmit={handleSave} className={`formGrid ${styles.devoteeForm}`}>
              <div className="formGroup">
                <label htmlFor="fd-first">First name *</label>
                <input
                  id="fd-first"
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label htmlFor="fd-last">Last name *</label>
                <input
                  id="fd-last"
                  required
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label htmlFor="fd-phone">Phone *</label>
                <input
                  id="fd-phone"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label htmlFor="fd-email">Email</label>
                <input
                  id="fd-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <RitualSelect
                id="fd-gotram"
                field="gotram"
                label="Gotram"
                value={form.gotram}
                onChange={(gotram) => setForm({ ...form, gotram })}
              />
              <RitualSelect
                id="fd-nakshatra"
                field="nakshatra"
                label="Nakshatra"
                value={form.nakshatra}
                onChange={(nakshatra) => setForm({ ...form, nakshatra })}
              />
              <div className="formGroup">
                <label htmlFor="fd-dob">Date of birth</label>
                <input
                  id="fd-dob"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label htmlFor="fd-gender">Gender</label>
                <select
                  id="fd-gender"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value as FormState['gender'] })}
                >
                  <option value="">—</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="formGroup">
                <label htmlFor="fd-family">Household ID</label>
                <input
                  id="fd-family"
                  value={form.familyId}
                  onChange={(e) => setForm({ ...form, familyId: e.target.value })}
                  placeholder="Link family members"
                />
              </div>
              <div className={`formGroup ${styles.spanFull}`}>
                <label htmlFor="fd-address">Address</label>
                <input
                  id="fd-address"
                  value={form.addressLine1}
                  onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                />
              </div>
              <div className="formGroup">
                <label htmlFor="fd-city">City</label>
                <input
                  id="fd-city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <CountryStateSelect
                countryId="fd-country"
                stateId="fd-state"
                country={form.country}
                state={form.state}
                onCountryChange={(country) => setForm({ ...form, country })}
                onStateChange={(state) => setForm({ ...form, state })}
              />
              <div className="formGroup">
                <label htmlFor="fd-postal">Postal</label>
                <input
                  id="fd-postal"
                  value={form.postalCode}
                  onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                />
              </div>
              {mode === 'edit' && (
                <div className="formGroup">
                  <label htmlFor="fd-status">Status</label>
                  <select
                    id="fd-status"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as FormState['status'] })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="renewal_due">Renewal due</option>
                  </select>
                </div>
              )}
              <div className={`formGroup ${styles.spanFull}`}>
                <div className={styles.detailActions}>
                  <Button type="submit" size="sm" disabled={busy}>
                    {busy ? 'Saving…' : mode === 'create' ? 'Create devotee' : 'Save changes'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      if (mode === 'create') {
                        setSelectedId(null);
                        setForm(EMPTY_FORM);
                        router.replace('/frontdesk/devotees', { scroll: false });
                        return;
                      }
                      setMode('view');
                      if (selectedId) {
                        router.replace(`/frontdesk/devotees?id=${selectedId}`, { scroll: false });
                      }
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          ) : selectedId ? (
            <>
              <div className={styles.detailActions}>
                <Button size="sm" variant="outline" onClick={openEdit} disabled={busy}>
                  Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => setMode('family')}>
                  + Family member
                </Button>
                <Button size="sm" variant="outline" onClick={handleDelete} disabled={busy}>
                  Delete
                </Button>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => router.push(`/frontdesk/console?devoteeId=${selectedId}`)}
                >
                  Use at counter →
                </Button>
              </div>
              <DevoteeProfilePanel
                ep={ep}
                devoteeId={selectedId}
                services={services ?? []}
                onSelectMember={selectDevotee}
                refreshToken={profileRefresh}
                showCrmLink={false}
              />
              {mode === 'family' && (
                <div className={styles.familyForm}>
                  <h4 className="tms-t3">Add family member</h4>
                  <form onSubmit={handleAddFamilyMember} className={styles.familyGrid}>
                    <div className="formGroup">
                      <label htmlFor="fm-first">First name *</label>
                      <input
                        id="fm-first"
                        required
                        value={familyForm.firstName}
                        onChange={(e) => setFamilyForm({ ...familyForm, firstName: e.target.value })}
                      />
                    </div>
                    <div className="formGroup">
                      <label htmlFor="fm-last">Last name</label>
                      <input
                        id="fm-last"
                        value={familyForm.lastName}
                        onChange={(e) => setFamilyForm({ ...familyForm, lastName: e.target.value })}
                        placeholder="Same household"
                      />
                    </div>
                    <div className="formGroup">
                      <label htmlFor="fm-phone">Phone *</label>
                      <input
                        id="fm-phone"
                        required
                        value={familyForm.phone}
                        onChange={(e) => setFamilyForm({ ...familyForm, phone: e.target.value })}
                      />
                    </div>
                    <RitualSelect
                      id="fm-gotram"
                      field="gotram"
                      label="Gotram"
                      value={familyForm.gotram}
                      onChange={(gotram) => setFamilyForm({ ...familyForm, gotram })}
                    />
                    <div className="formGroup" style={{ gridColumn: '1 / -1' }}>
                      <div className={styles.detailActions}>
                        <Button type="submit" size="sm" disabled={busy}>
                          Add member
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => setMode('view')}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </>
          ) : (
            <p className={styles.emptyDetail}>
              Select a devotee from the directory, or click <strong>+ New devotee</strong> to register.
            </p>
          )}
        </GlassCard>
      </div>
    </>
  );
}

export default function FrontDeskDevoteesPage() {
  return (
    <Suspense fallback={<p className="tms-t2">Loading…</p>}>
      <FrontDeskDevoteesPageInner />
    </Suspense>
  );
}
