'use client';

import type { CommitteeMember, CommitteeRoster, CommitteeRosterCategory } from '@tms/types';
import { AppPage } from '@/components/AppPage';
import { useApi } from '@/lib/api/use-api';
import styles from './directory.module.css';

function memberLabel(member: CommitteeMember): string {
  const title =
    member.displayTitle ??
    (member.role === 'chair' ? 'Chair' : member.role === 'vice_chair' ? 'Co-Chair' : null);
  return title ? `${member.name} · ${title}` : member.name;
}

function isLead(member: CommitteeMember): boolean {
  return member.role === 'chair' || member.role === 'vice_chair';
}

function rosterTotals(roster: CommitteeRoster) {
  let committees = 0;
  let members = 0;
  for (const group of roster.categories) {
    committees += group.committees.length;
    for (const entry of group.committees) {
      members += entry.members.length;
    }
  }
  return { committees, members };
}

function CommitteeCard({
  name,
  purpose,
  committeeType,
  meetingCadence,
  members,
}: {
  name: string;
  purpose?: string;
  committeeType: string;
  meetingCadence?: string;
  members: CommitteeMember[];
}) {
  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <h3 className={styles.cardName}>{name}</h3>
        <span className={styles.memberCount}>{members.length}</span>
      </div>
      <div className={styles.cardMeta}>
        <span className={styles.metaTag}>{committeeType.replace('_', ' ')}</span>
        {meetingCadence && (
          <>
            <span className={styles.metaTag}>·</span>
            <span className={styles.metaTag}>{meetingCadence.replace('_', ' ')}</span>
          </>
        )}
      </div>
      {purpose && <p className={styles.cardPurpose}>{purpose}</p>}
      <div className={styles.members}>
        {members.map((m) => (
          <span
            key={m.id}
            className={[styles.memberChip, isLead(m) ? styles.memberChipLead : ''].join(' ')}
            title={memberLabel(m)}
          >
            {memberLabel(m)}
          </span>
        ))}
      </div>
    </article>
  );
}

function RosterSection({ group }: { group: CommitteeRosterCategory }) {
  return (
    <section id={`category-${group.category}`} className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{group.label}</h2>
        <span className={styles.sectionCount}>
          {group.committees.length} committee{group.committees.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className={styles.cardGrid}>
        {group.committees.map(({ committee, members }) => (
          <CommitteeCard
            key={committee.id}
            name={committee.name}
            purpose={committee.purpose ?? committee.description}
            committeeType={committee.committeeType}
            meetingCadence={committee.meetingCadence}
            members={members}
          />
        ))}
      </div>
    </section>
  );
}

export default function CommitteeDirectoryPage() {
  const { data, loading, error } = useApi((ep) => ep.getCommitteeRoster());
  const roster = data;
  const totals = roster ? rosterTotals(roster) : null;

  function scrollToCategory(category: string) {
    document.getElementById(`category-${category}`)?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <AppPage
      subtitle="Temple committees and members, grouped by category"
      loading={loading}
      error={error}
      showTenantContext={false}
    >
      {roster && (
        <>
          {roster.categories.length === 0 ? (
            <p className="hint">No public committee rosters available.</p>
          ) : (
            <>
              <div className={styles.summary}>
                <div className={styles.summaryStats}>
                  <span className={styles.summaryStat}>
                    <strong>{totals?.committees ?? 0}</strong> committees
                  </span>
                  <span className={styles.summaryStat}>
                    <strong>{totals?.members ?? 0}</strong> members listed
                  </span>
                  <span className={styles.summaryStat}>
                    <strong>{roster.categories.length}</strong> categories
                  </span>
                </div>
                <nav className={styles.categoryNav} aria-label="Jump to category">
                  {roster.categories.map((group) => (
                    <button
                      key={group.category}
                      type="button"
                      className={styles.categoryPill}
                      onClick={() => scrollToCategory(group.category)}
                    >
                      {group.label}
                    </button>
                  ))}
                </nav>
              </div>

              {roster.categories.map((group) => (
                <RosterSection key={group.category} group={group} />
              ))}
            </>
          )}
        </>
      )}
    </AppPage>
  );
}
