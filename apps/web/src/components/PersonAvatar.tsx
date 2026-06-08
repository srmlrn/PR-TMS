'use client';

import { useState } from 'react';
import { getPersonAvatarUrl, getPersonHue, getPersonInitials } from '@tms/types';
import styles from './PersonAvatar.module.css';

export type PersonAvatarSize = 'sm' | 'md' | 'lg';

const sizeClass: Record<PersonAvatarSize, string> = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
};

export function PersonAvatar({
  name,
  photoUrl,
  size = 'md',
  className,
}: {
  name: string;
  photoUrl?: string;
  size?: PersonAvatarSize;
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = getPersonAvatarUrl(name, photoUrl);
  const initials = getPersonInitials(name);
  const hue = getPersonHue(name);

  const classes = [styles.avatar, sizeClass[size], className ?? ''].filter(Boolean).join(' ');

  if (!imgFailed && src) {
    return (
      <img
        className={classes}
        src={src}
        alt=""
        aria-hidden
        loading="lazy"
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <span
      className={[classes, styles.fallback].join(' ')}
      style={{ background: `hsl(${hue} 42% 88%)`, color: `hsl(${hue} 48% 28%)` }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function PersonRow({
  name,
  photoUrl,
  subtitle,
  size = 'md',
  children,
  className,
}: {
  name: string;
  photoUrl?: string;
  subtitle?: string;
  size?: PersonAvatarSize;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={[styles.row, className ?? ''].filter(Boolean).join(' ')}>
      <PersonAvatar name={name} photoUrl={photoUrl} size={size} />
      <div className={styles.rowText}>
        <span className={styles.rowName}>{name}</span>
        {subtitle && <span className={styles.rowSub}>{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}
