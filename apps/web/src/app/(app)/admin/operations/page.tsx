'use client';

import Link from 'next/link';
import { AppPage } from '@/components/AppPage';
import styles from '../people/people.module.css';

const SECTIONS = [
  {
    href: '/admin/reminders',
    emoji: '🔔',
    title: 'Important Dates',
    description: 'Birthdays, anniversaries, and star-day reminders for devotees.',
  },
  {
    href: '/admin/communications',
    emoji: '✉️',
    title: 'Communications',
    description: 'Send email or SMS using temple notification templates.',
  },
  {
    href: '/admin/subscriptions',
    emoji: '🔁',
    title: 'Recurring Subscriptions',
    description: 'Manage recurring seva bookings and donation schedules.',
  },
  {
    href: '/admin/rentals',
    emoji: '🏛️',
    title: 'Venue & Rentals',
    description: 'Hall bookings, equipment loans, and rental orders.',
  },
];

export default function OperationsHubPage() {
  return (
    <AppPage
      subtitle="Reminders, outreach, subscriptions, and facility rentals"
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
