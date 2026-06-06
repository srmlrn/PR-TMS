'use client';

import { useEffect, useState } from 'react';
import { Button } from '@tms/ui';
import { useTheme } from '@/lib/theme-context';
import styles from './ThemeToggle.module.css';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={styles.toggle}
        aria-hidden
        tabIndex={-1}
        disabled
      >
        <span aria-hidden>🌙</span>
        <span className={styles.label}>Dark</span>
      </Button>
    );
  }

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
