'use client';

import Link from 'next/link';
import { AppPage } from '@/components/AppPage';
import styles from './people.module.css';

const SECTIONS = [
  {
    href: '/admin/people/staff',
    emoji: '📋',
    title: 'Staff Roster',
    description: 'Add priests, front desk, and volunteers. Track titles and departments.',
  },
  {
    href: '/admin/people/users',
    emoji: '🔐',
    title: 'Users & Roles',
    description: 'Create login accounts, assign roles, and link staff profiles.',
  },
  {
    href: '/admin/people/leaves',
    emoji: '🏖️',
    title: 'Leave Management',
    description: 'Review pending requests and approve priest time off.',
  },
];

export default function PeopleHubPage() {
  return (
    <AppPage
      subtitle="Staff roster, tenant users, and leave requests"
      showTenantContext={false}
    >
      <div className={styles.hubGrid}>
        {SECTIONS.map((section) => (
          <Link key={section.href} href={section.href} className={styles.hubCard}>
            <span style={{ fontSize: '1.75rem' }}>{section.emoji}</span>
            <strong>{section.title}</strong>
            <span className="tms-t2">{section.description}</span>
          </Link>
        ))}
      </div>
    </AppPage>
  );
}
