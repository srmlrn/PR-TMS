'use client';

import { Button } from '@tms/ui';
import { useTheme } from '@/lib/theme-context';
import styles from './ThemeToggle.module.css';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={styles.toggle}
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      title={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
    >
      <span aria-hidden>{theme === 'light' ? '🌙' : '☀️'}</span>
      <span className={styles.label}>{theme === 'light' ? 'Dark' : 'Light'}</span>
    </Button>
  );
}
