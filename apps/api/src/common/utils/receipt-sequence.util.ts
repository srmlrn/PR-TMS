/** Next RCT-{year}-{seq} from existing receipt numbers (bookings + donations). */
export function nextReceiptSequence(
  receiptNumbers: Array<string | undefined>,
  year: number,
  floor = 0,
): number {
  const prefix = `RCT-${year}-`;
  const max = receiptNumbers
    .filter((r): r is string => !!r && r.startsWith(prefix))
    .map((r) => parseInt(r.split('-')[2] ?? '0', 10))
    .reduce((m, n) => Math.max(m, n), floor);
  return max + 1;
}

export function formatReceiptNumber(year: number, sequence: number): string {
  return `RCT-${year}-${String(sequence).padStart(4, '0')}`;
}
