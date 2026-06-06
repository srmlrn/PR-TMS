'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './DockNav.module.css';

export interface DockNavItem {
  id: string;
  emoji: string;
  label: string;
  href: string;
}

export interface DockNavProps {
  items: DockNavItem[];
  homeHref?: string;
  homeLabel?: string;
}

export function DockNav({
  items,
  homeHref = '/',
  homeLabel = 'All Screens',
}: DockNavProps) {
  const pathname = usePathname();

  return (
    <nav className={styles.dock} aria-label="Main navigation">
      <Link href={homeHref} className={styles.item} title={homeLabel}>
        🏛️
        <span className={styles.tip}>{homeLabel}</span>
      </Link>
      <div className={styles.sep} />
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.id}
            href={item.href}
            className={[styles.item, isActive ? styles.active : ''].filter(Boolean).join(' ')}
            aria-current={isActive ? 'page' : undefined}
          >
            {item.emoji}
            <span className={styles.tip}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
