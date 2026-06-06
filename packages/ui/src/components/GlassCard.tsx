import type { ReactNode } from 'react';
import styles from './GlassCard.module.css';

export interface GlassCardProps {
  title?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  noBodyPadding?: boolean;
}

export function GlassCard({
  title,
  headerRight,
  children,
  className,
  bodyClassName,
  noBodyPadding = false,
}: GlassCardProps) {
  const hasHeader = title !== undefined || headerRight !== undefined;

  return (
    <div className={[styles.card, className ?? ''].filter(Boolean).join(' ')}>
      {hasHeader && (
        <div className={styles.header}>
          {title !== undefined && <h4 className={styles.headerTitle}>{title}</h4>}
          {headerRight}
        </div>
      )}
      <div
        className={[
          styles.body,
          noBodyPadding ? styles.noPadding : '',
          bodyClassName ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
    </div>
  );
}
