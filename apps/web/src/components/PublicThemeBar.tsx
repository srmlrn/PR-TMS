'use client';

import { ThemeToggle } from '@/components/ThemeToggle';
import styles from './PublicThemeBar.module.css';

export function PublicThemeBar() {
  return (
    <div className={styles.bar}>
      <ThemeToggle />
    </div>
  );
}
