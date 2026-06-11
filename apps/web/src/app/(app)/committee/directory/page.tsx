'use client';

import { useMemo, useState } from 'react';
import { Button } from '@tms/ui';
import {
  UserRole,
  type Committee,
  type CommitteeMember,
  type CommitteeMemberRole,
  type CommitteeRoster,
  type CreateCommitteeMemberInput,
  type UpdateCommitteeMemberInput,
} from '@tms/types';
import { AppPage } from '@/components/AppPage';
import { PersonRow } from '@/components/PersonAvatar';
import { createEndpoints } from '@/lib/api/endpoints';
import { useAuth } from '@/lib/auth-context';
import { useCommitteeContextOptional } from '@/lib/committee-context';
import { useTenant } from '@/lib/tenant-context';
import { useApi } from '@/lib/api/use-api';
import styles from './directory.module.css';

type RosterEntry = {
  committee: Committee;
  members: CommitteeMember[];
  category: string;
  categoryLabel: string;
};

const ROLE_FILTER_OPTIONS: Array<{ value: '' | CommitteeMemberRole; label: string }> = [
  { value: '', label: 'All roles' },
  { value: 'chair', label: 'Chair' },
  { value: 'vice_chair', label: 'Co-Chair' },
  { value: 'secretary', label: 'Secretary' },
  { value: 'member', label: 'Member' },
];

function flattenRoster(roster: CommitteeRoster): RosterEntry[] {
  const entries: RosterEntry[] = [];
  for (const group of roster.categories) {
    for (const item of group.committees) {
      entries.push({
        committee: item.committee,
        members: item.members,
        category: group.category,
        categoryLabel: group.label,
      });
    }
  }
  return entries;
}

function memberTitle(member: CommitteeMember): string {
  return (
    member.displayTitle ??
    (member.role === 'chair' ? 'Chair' : member.role === 'vice_chair' ? 'Co-Chair' : member.role)
  );
}

function emptyMemberForm(): CreateCommitteeMemberInput {
  return {
    userId: crypto.randomUUID(),
    name: '',
    email: '',
    role: 'member',
    displayTitle: '',
  };
}

export default function CommitteeDirectoryPage() {
  const { user } = useAuth();
  const { api } = useTenant();
  const committeeCtx = useCommitteeContextOptional();
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;

  const { data: roster, loading, error, refetch } = useApi((ep) => ep.getCommitteeRoster());

  const entries = useMemo(() => (roster ? flattenRoster(roster) : []), [roster]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [committeeQuery, setCommitteeQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [memberQuery, setMemberQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'' | CommitteeMemberRole>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addForm, setAddForm] = useState<CreateCommitteeMemberInput>(emptyMemberForm);
  const [editForm, setEditForm] = useState<UpdateCommitteeMemberInput>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of entries) {
      seen.set(e.category, e.categoryLabel);
    }
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  }, [entries]);

  const filteredCommittees = useMemo(() => {
    const q = committeeQuery.trim().toLowerCase();
    return entries.filter((e) => {
      if (categoryFilter && e.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        e.committee.name.toLowerCase().includes(q) ||
        (e.committee.purpose ?? '').toLowerCase().includes(q) ||
        e.categoryLabel.toLowerCase().includes(q)
      );
    });
  }, [entries, committeeQuery, categoryFilter]);

  const selected =
    filteredCommittees.find((e) => e.committee.id === selectedId) ??
    filteredCommittees[0] ??
    entries.find((e) => e.committee.id === selectedId) ??
    entries[0] ??
    null;

  const activeCommitteeId = selected?.committee.id ?? null;

  const canManage = useMemo(() => {
    if (!activeCommitteeId) return false;
    if (isAdmin) return true;
    const c = committeeCtx?.committees.find((x) => x.id === activeCommitteeId);
    return c?.myRole === 'chair' || c?.myRole === 'vice_chair';
  }, [activeCommitteeId, isAdmin, committeeCtx?.committees]);

  const filteredMembers = useMemo(() => {
    if (!selected) return [];
    const q = memberQuery.trim().toLowerCase();
    return selected.members.filter((m) => {
      if (!m.isActive) return false;
      if (roleFilter && m.role !== roleFilter) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        (m.email ?? '').toLowerCase().includes(q) ||
        memberTitle(m).toLowerCase().includes(q)
      );
    });
  }, [selected, memberQuery, roleFilter]);

  async function runSave(action: () => Promise<void>) {
    setSaving(true);
    setMsg(null);
    try {
      await action();
      await refetch();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd() {
    if (!activeCommitteeId || !addForm.name.trim()) {
      setMsg('Name is required');
      return;
    }
    await runSave(async () => {
      const ep = createEndpoints(api);
      await ep.addCommitteeMember(activeCommitteeId, {
        ...addForm,
        name: addForm.name.trim(),
        email: addForm.email?.trim() || undefined,
        displayTitle: addForm.displayTitle?.trim() || undefined,
      });
      setAddForm(emptyMemberForm());
      setShowAddPanel(false);
      setMsg('Member added.');
    });
  }

  async function handleUpdate(memberId: string) {
    if (!activeCommitteeId) return;
    await runSave(async () => {
      const ep = createEndpoints(api);
      await ep.updateCommitteeMember(activeCommitteeId, memberId, {
        ...editForm,
        name: editForm.name?.trim(),
        email: editForm.email?.trim() || undefined,
        displayTitle: editForm.displayTitle?.trim() || undefined,
      });
      setEditingId(null);
      setEditForm({});
      setMsg('Member updated.');
    });
  }

  function startEdit(member: CommitteeMember) {
    setShowAddPanel(false);
    setEditingId(member.id);
    setEditForm({
      name: member.name,
      email: member.email ?? '',
      role: member.role,
      displayTitle: member.displayTitle ?? '',
    });
  }

  const totals = roster
    ? {
        committees: entries.length,
        members: entries.reduce((n, e) => n + e.members.length, 0),
        categories: roster.categories.length,
      }
    : null;

  return (
    <AppPage
      subtitle="Browse committees and manage rosters"
      loading={loading}
      error={error}
      showTenantContext={false}
    >
      {roster && (
        <div className={styles.shell}>
          {totals && (
            <div className={styles.summary}>
              <span>
                <strong>{totals.committees}</strong> committees
              </span>
              <span>
                <strong>{totals.members}</strong> members
              </span>
              <span>
                <strong>{totals.categories}</strong> categories
              </span>
            </div>
          )}

          {entries.length === 0 ? (
            <p className="hint">No public committee rosters available.</p>
          ) : (
            <div className={styles.split}>
              <aside className={styles.listPane}>
                <div className={styles.listTools}>
                  <input
                    type="search"
                    value={committeeQuery}
                    onChange={(e) => setCommitteeQuery(e.target.value)}
                    aria-label="Search committees"
                  />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    aria-label="Filter by category"
                  >
                    <option value="">All categories</option>
                    {categories.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.listScroll}>
                  {filteredCommittees.length === 0 ? (
                    <p className={styles.emptyPane}>No committees match</p>
                  ) : (
                    categories
                      .filter(
                        (c) =>
                          !categoryFilter || c.value === categoryFilter,
                      )
                      .map((cat) => {
                        const items = filteredCommittees.filter(
                          (e) => e.category === cat.value,
                        );
                        if (items.length === 0) return null;
                        return (
                          <div key={cat.value} className={styles.categoryBlock}>
                            <div className={styles.categoryLabel}>{cat.label}</div>
                            {items.map((e) => {
                              const active =
                                (selectedId ?? selected?.committee.id) === e.committee.id;
                              return (
                                <button
                                  key={e.committee.id}
                                  type="button"
                                  className={[
                                    styles.committeeBtn,
                                    active ? styles.committeeBtnActive : '',
                                  ].join(' ')}
                                  onClick={() => {
                                    setSelectedId(e.committee.id);
                                    setEditingId(null);
                                    setShowAddPanel(false);
                                    setMemberQuery('');
                                    setRoleFilter('');
                                  }}
                                >
                                  <span>{e.committee.name}</span>
                                  <span className={styles.committeeCount}>
                                    {e.members.length}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })
                  )}
                </div>
              </aside>

              <section className={styles.detailPane}>
                {!selected ? (
                  <p className={styles.emptyPane}>Select a committee</p>
                ) : (
                  <>
                    <div className={styles.detailBody}>
                      <header className={styles.detailHeader}>
                        <h2 className={styles.detailTitle}>{selected.committee.name}</h2>
                        <div className={styles.detailMeta}>
                          <span>{selected.categoryLabel}</span>
                          <span>·</span>
                          <span>{selected.committee.committeeType.replace('_', ' ')}</span>
                          {selected.committee.meetingCadence && (
                            <>
                              <span>·</span>
                              <span>{selected.committee.meetingCadence.replace('_', ' ')}</span>
                            </>
                          )}
                          <span>·</span>
                          <span>{selected.members.length} members</span>
                        </div>
                        {(selected.committee.purpose ?? selected.committee.description) && (
                          <p className={styles.detailPurpose}>
                            {selected.committee.purpose ?? selected.committee.description}
                          </p>
                        )}
                      </header>

                      <div className={styles.detailTools}>
                        <input
                          type="search"
                          value={memberQuery}
                          onChange={(e) => setMemberQuery(e.target.value)}
                          aria-label="Search members"
                        />
                        <select
                          value={roleFilter}
                          onChange={(e) =>
                            setRoleFilter(e.target.value as '' | CommitteeMemberRole)
                          }
                          aria-label="Filter by role"
                        >
                          {ROLE_FILTER_OPTIONS.map((o) => (
                            <option key={o.label} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        {canManage && (
                          <Button
                            size="sm"
                            variant={showAddPanel ? 'primary' : 'outline'}
                            onClick={() => {
                              setShowAddPanel((open) => !open);
                              setEditingId(null);
                            }}
                          >
                            {showAddPanel ? 'Close' : 'Add'}
                          </Button>
                        )}
                      </div>

                      <div className={styles.memberTable}>
                        {filteredMembers.length === 0 ? (
                          <p className={styles.emptyPane}>No members match</p>
                        ) : (
                          filteredMembers.map((m) => (
                            <div key={m.id} className={styles.memberRow}>
                              <PersonRow
                                name={m.name}
                                photoUrl={m.photoUrl}
                                subtitle={m.email ?? '—'}
                              />
                              <span
                                className={[
                                  styles.roleTag,
                                  m.role === 'chair' || m.role === 'vice_chair'
                                    ? styles.roleTagLead
                                    : '',
                                ].join(' ')}
                              >
                                {memberTitle(m)}
                              </span>
                              {canManage && (
                                <Button size="sm" variant="outline" onClick={() => startEdit(m)}>
                                  Edit
                                </Button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {(msg || (canManage && (editingId || showAddPanel))) && (
                      <div className={styles.detailManage}>
                        {msg && <p className={styles.flash}>{msg}</p>}

                        {canManage && editingId && (
                      <div className={styles.managePanel}>
                        <h3 className={styles.manageTitle}>Edit member</h3>
                        <div className={styles.formGrid}>
                          <label className={styles.formField}>
                            Name
                            <input
                              value={editForm.name ?? ''}
                              onChange={(e) =>
                                setEditForm({ ...editForm, name: e.target.value })
                              }
                            />
                          </label>
                          <label className={styles.formField}>
                            Email
                            <input
                              value={editForm.email ?? ''}
                              onChange={(e) =>
                                setEditForm({ ...editForm, email: e.target.value })
                              }
                            />
                          </label>
                          <label className={styles.formField}>
                            Role
                            <select
                              value={editForm.role ?? 'member'}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  role: e.target.value as CommitteeMemberRole,
                                })
                              }
                            >
                              <option value="chair">Chair</option>
                              <option value="vice_chair">Co-Chair</option>
                              <option value="secretary">Secretary</option>
                              <option value="member">Member</option>
                            </select>
                          </label>
                          <label className={styles.formField}>
                            Display title
                            <input
                              value={editForm.displayTitle ?? ''}
                              onChange={(e) =>
                                setEditForm({ ...editForm, displayTitle: e.target.value })
                              }
                            />
                          </label>
                        </div>
                        <div className={styles.formActions}>
                          <Button
                            size="sm"
                            disabled={saving}
                            onClick={() => void handleUpdate(editingId)}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingId(null);
                              setEditForm({});
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                        )}

                        {canManage && showAddPanel && (
                      <div className={styles.managePanel}>
                        <h3 className={styles.manageTitle}>Add member</h3>
                        <div className={styles.formGrid}>
                          <label className={styles.formField}>
                            Name
                            <input
                              value={addForm.name}
                              onChange={(e) =>
                                setAddForm({ ...addForm, name: e.target.value })
                              }
                            />
                          </label>
                          <label className={styles.formField}>
                            Email
                            <input
                              value={addForm.email ?? ''}
                              onChange={(e) =>
                                setAddForm({ ...addForm, email: e.target.value })
                              }
                            />
                          </label>
                          <label className={styles.formField}>
                            Role
                            <select
                              value={addForm.role}
                              onChange={(e) =>
                                setAddForm({
                                  ...addForm,
                                  role: e.target.value as CommitteeMemberRole,
                                })
                              }
                            >
                              <option value="chair">Chair</option>
                              <option value="vice_chair">Co-Chair</option>
                              <option value="secretary">Secretary</option>
                              <option value="member">Member</option>
                            </select>
                          </label>
                          <label className={styles.formField}>
                            Display title
                            <input
                              value={addForm.displayTitle ?? ''}
                              onChange={(e) =>
                                setAddForm({ ...addForm, displayTitle: e.target.value })
                              }
                            />
                          </label>
                        </div>
                        <div className={styles.formActions}>
                          <Button size="sm" disabled={saving} onClick={() => void handleAdd()}>
                            Add member
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowAddPanel(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </section>
            </div>
          )}
        </div>
      )}
    </AppPage>
  );
}
