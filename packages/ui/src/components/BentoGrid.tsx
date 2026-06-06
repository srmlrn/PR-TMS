import type { ReactNode } from 'react';
import styles from './BentoGrid.module.css';

export type BentoSpan = 3 | 4 | 5 | 6 | 7 | 8 | 9 | 12;

export interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

export interface BentoItemProps {
  children: ReactNode;
  span?: BentoSpan;
  rowSpan?: 1 | 2;
  className?: string;
}

const spanClass: Record<BentoSpan, string> = {
  3: styles.span3,
  4: styles.span4,
  5: styles.span5,
  6: styles.span6,
  7: styles.span7,
  8: styles.span8,
  9: styles.span9,
  12: styles.span12,
};

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div className={[styles.grid, className ?? ''].filter(Boolean).join(' ')}>{children}</div>
  );
}

export function BentoItem({ children, span = 12, rowSpan = 1, className }: BentoItemProps) {
  return (
    <div
      className={[
        spanClass[span],
        rowSpan === 2 ? styles.row2 : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
