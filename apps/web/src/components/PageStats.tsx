import { BentoGrid, BentoItem, StatTile, type StatAccent } from '@tms/ui';

export interface PageStatItem {
  icon: string;
  label: string;
  value: string | number;
  accent?: StatAccent;
  change?: string;
}

export function PageStats({ items, className }: { items: PageStatItem[]; className?: string }) {
  const span = items.length <= 3 ? 4 : 3;
  return (
    <BentoGrid className={className ?? 'mb2'}>
      {items.map((item) => (
        <BentoItem key={item.label} span={span as 3 | 4}>
          <StatTile
            icon={item.icon}
            label={item.label}
            value={String(item.value)}
            change={item.change}
            accent={item.accent ?? 'green'}
            compact
          />
        </BentoItem>
      ))}
    </BentoGrid>
  );
}
