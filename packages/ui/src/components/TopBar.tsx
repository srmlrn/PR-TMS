'use client';

import type { ReactNode } from 'react';
import { EnvBadge, type EnvBadgeVariant } from './Badge';
import styles from './TopBar.module.css';

export interface TopBarProps {
  title: string;
  envLabel?: string;
  envVariant?: EnvBadgeVariant;
  avatarInitials?: string;
  searchPlaceholder?: string;
  languages?: string[];
  roleSwitcher?: ReactNode;
}

export function TopBar({
  title,
  envLabel = 'PROD',
  envVariant = 'prod',
  avatarInitials = 'RK',
  searchPlaceholder = 'Search devotees, receipts, bookings…',
  languages = ['EN', 'हि', 'தமி', 'తె'],
  roleSwitcher,
}: TopBarProps) {
  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <span className={styles.brand}>🛕 TMS</span>
        <span className={styles.sep}>/</span>
        <span className={styles.title}>{title}</span>
        <EnvBadge variant={envVariant}>{envLabel}</EnvBadge>
      </div>
      <div className={styles.right}>
        <div className={styles.searchPill}>
          <span className={styles.searchIcon} aria-hidden>
            ⌕
          </span>
          <input
            className={styles.searchInput}
            placeholder={searchPlaceholder}
            aria-label="Search"
          />
        </div>
        <select className={styles.select} aria-label="Language" defaultValue="EN">
          {languages.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
        {roleSwitcher}
        <div className={styles.avatar} aria-hidden>
          {avatarInitials}
        </div>
      </div>
    </header>
  );
}
