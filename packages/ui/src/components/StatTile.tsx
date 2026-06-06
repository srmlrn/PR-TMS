import type { ReactNode } from 'react';
import styles from './StatTile.module.css';

export type StatAccent = 'amber' | 'green' | 'blue' | 'red';
export type StatChangeTone = 'up' | 'down' | 'neutral';

export interface StatTileProps {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  change?: ReactNode;
  changeTone?: StatChangeTone;
  accent?: StatAccent;
  valueSize?: 'default' | 'sm';
  compact?: boolean;
  sparkline?: ReactNode;
  className?: string;
}

const accentClass: Record<StatAccent, string> = {
  amber: styles.amber,
  green: styles.green,
  blue: styles.blue,
  red: styles.red,
};

const changeToneClass: Record<StatChangeTone, string> = {
  up: styles.up,
  down: styles.down,
  neutral: styles.neutral,
};

export function StatTile({
  icon,
  label,
  value,
  change,
  changeTone = 'neutral',
  accent = 'amber',
  valueSize = 'default',
  compact = false,
  sparkline,
  className,
}: StatTileProps) {
  const content = (
    <>
      <div className={styles.label}>{label}</div>
      <div className={[styles.value, valueSize === 'sm' ? styles.valueSm : ''].filter(Boolean).join(' ')}>
        {value}
      </div>
      {change !== undefined && (
        <div className={[styles.change, changeToneClass[changeTone]].join(' ')}>{change}</div>
      )}
    </>
  );

  return (
    <div
      className={[
        styles.tile,
        accentClass[accent],
        compact ? styles.compact : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {icon !== undefined && <span className={styles.icon}>{icon}</span>}
      {compact ? <div className={styles.meta}>{content}</div> : content}
      {sparkline !== undefined && <div className={styles.spark}>{sparkline}</div>}
    </div>
  );
}
