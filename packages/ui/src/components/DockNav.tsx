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
  variant?: 'dock' | 'sidebar';
  brandLabel?: string;
}

export function DockNav({
  items,
  homeHref = '/',
  homeLabel = 'All Screens',
  variant = 'dock',
  brandLabel = 'TMS',
}: DockNavProps) {
  const pathname = usePathname();
  const isSidebar = variant === 'sidebar';

  return (
    <nav
      className={[styles.dock, isSidebar ? styles.sidebar : ''].filter(Boolean).join(' ')}
      aria-label="Main navigation"
    >
      {isSidebar ? (
        <Link href={homeHref} className={styles.brand}>
          <span className={styles.brandIcon} aria-hidden>
            🛕
          </span>
          <span className={styles.brandText}>{brandLabel}</span>
        </Link>
      ) : (
        <>
          <Link href={homeHref} className={styles.item} title={homeLabel}>
            🏛️
            <span className={styles.tip}>{homeLabel}</span>
          </Link>
          <div className={styles.sep} />
        </>
      )}

      {isSidebar && <p className={styles.sectionLabel}>Menu</p>}

      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const itemClass = [
          isSidebar ? styles.sidebarItem : styles.item,
          isActive ? styles.active : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <Link
            key={item.id}
            href={item.href}
            className={itemClass}
            aria-current={isActive ? 'page' : undefined}
            title={isSidebar ? undefined : item.label}
          >
            <span className={styles.itemIcon} aria-hidden>
              {item.emoji}
            </span>
            {isSidebar ? (
              <span className={styles.itemLabel}>{item.label}</span>
            ) : (
              <span className={styles.tip}>{item.label}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
