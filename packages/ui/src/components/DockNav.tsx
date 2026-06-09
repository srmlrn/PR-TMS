'use client';

import { useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './DockNav.module.css';

const DOCK_COLLAPSED_KEY = 'tms-dock-collapsed';

function readDockCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(DOCK_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

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
  brandIcon?: string;
}

export function DockNav({
  items,
  homeHref = '/',
  homeLabel = 'All Screens',
  variant = 'dock',
  brandLabel = 'TMS',
  brandIcon = '🛕',
}: DockNavProps) {
  const pathname = usePathname();
  const isSidebar = variant === 'sidebar';
  const [collapsed, setCollapsed] = useState(readDockCollapsed);

  useLayoutEffect(() => {
    if (!isSidebar) return;
    document.documentElement.dataset.dockCollapsed = collapsed ? 'true' : 'false';
    try {
      localStorage.setItem(DOCK_COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed, isSidebar]);

  return (
    <nav
      className={[
        styles.dock,
        isSidebar ? styles.sidebar : '',
        isSidebar && collapsed ? styles.sidebarCollapsed : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Main navigation"
    >
      {isSidebar ? (
        <Link
          href={homeHref}
          className={styles.brand}
          title={collapsed ? brandLabel : undefined}
        >
          <span className={styles.brandIcon} aria-hidden>
            {brandIcon}
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
            title={isSidebar && collapsed ? item.label : isSidebar ? undefined : item.label}
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

      {isSidebar && (
        <button
          type="button"
          className={[
            styles.railToggle,
            collapsed ? styles.railToggleCollapsed : styles.railToggleExpanded,
          ].join(' ')}
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className={styles.railChevron}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}
    </nav>
  );
}
