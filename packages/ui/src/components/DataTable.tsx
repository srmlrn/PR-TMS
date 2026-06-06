import type { ReactNode } from 'react';
import styles from './DataTable.module.css';

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  className?: string;
}

export function DataTable<T>({ columns, data, getRowKey, className }: DataTableProps<T>) {
  return (
    <div className={[styles.wrapper, className ?? ''].filter(Boolean).join(' ')}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={styles.th}
                style={col.align ? { textAlign: col.align } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={getRowKey(row)} className={styles.row}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={styles.td}
                  style={col.align ? { textAlign: col.align } : undefined}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const dataTableAmountStyles = {
  green: styles.amountGreen,
  amber: styles.amountAmber,
  red: styles.amountRed,
} as const;
