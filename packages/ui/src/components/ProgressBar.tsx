import styles from './ProgressBar.module.css';

export type ProgressColor = 'amber' | 'green' | 'blue' | 'red' | 'platinum' | 'silver' | 'purple';

export interface ProgressBarProps {
  value: number;
  max?: number;
  color?: ProgressColor;
  className?: string;
}

const colorClass: Record<ProgressColor, string> = {
  amber: styles.amber,
  green: styles.green,
  blue: styles.blue,
  red: styles.red,
  platinum: styles.platinum,
  silver: styles.silver,
  purple: styles.purple,
};

export function ProgressBar({ value, max = 100, color = 'amber', className }: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={[styles.track, className ?? ''].filter(Boolean).join(' ')}>
      <div
        className={[styles.fill, colorClass[color]].join(' ')}
        style={{ width: `${percent}%` }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      />
    </div>
  );
}
