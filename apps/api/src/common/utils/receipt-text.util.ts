import { TaxReceipt } from '@tms/types';

export function formatReceiptText(receipt: TaxReceipt): string {
  const lines = [
    '========================================',
    `  ${receipt.templeName}`,
    '  OFFICIAL RECEIPT',
    '========================================',
    '',
    `Receipt No:  ${receipt.receiptNumber}`,
    `Issued:      ${receipt.issuedAt.slice(0, 10)}`,
    '',
    `Amount:      ${receipt.currency} ${receipt.amount.toFixed(2)}`,
    `Purpose:     ${receipt.purpose}`,
  ];

  if (receipt.taxDocType) {
    lines.push(`Tax Doc:     ${receipt.taxDocType.toUpperCase()}`);
  }
  if (receipt.taxId) {
    lines.push(`Tax ID:      ${receipt.taxId}`);
  }

  lines.push('', 'Thank you for your generous support.', '========================================');
  return lines.join('\n');
}
