import type { ReactNode } from 'react';
import styles from './Badge.module.css';

export type BadgeVariant = 'ok' | 'pending' | 'info' | 'error';
export type ChipVariant = 'amber' | 'green' | 'blue';
export type EnvBadgeVariant = 'prod' | 'uat' | 'dev';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

export interface ChipProps {
  variant?: ChipVariant;
  children: ReactNode;
  className?: string;
}

export interface EnvBadgeProps {
  variant: EnvBadgeVariant;
  children: ReactNode;
  className?: string;
}

const badgeVariantClass: Record<BadgeVariant, string> = {
  ok: styles.ok,
  pending: styles.pending,
  info: styles.info,
  error: styles.error,
};

const chipVariantClass: Record<ChipVariant, string> = {
  amber: styles.chip,
  green: styles.chipGreen,
  blue: styles.chipBlue,
};

const envVariantClass: Record<EnvBadgeVariant, string> = {
  prod: styles.envProd,
  uat: styles.envUat,
  dev: styles.envDev,
};

export function Badge({ variant = 'ok', children, className }: BadgeProps) {
  return (
    <span className={[styles.badge, badgeVariantClass[variant], className ?? ''].filter(Boolean).join(' ')}>
      {children}
    </span>
  );
}

export function Chip({ variant = 'amber', children, className }: ChipProps) {
  return (
    <span className={[chipVariantClass[variant], className ?? ''].filter(Boolean).join(' ')}>
      {children}
    </span>
  );
}

export function EnvBadge({ variant, children, className }: EnvBadgeProps) {
  return (
    <span className={[envVariantClass[variant], className ?? ''].filter(Boolean).join(' ')}>
      {children}
    </span>
  );
}
