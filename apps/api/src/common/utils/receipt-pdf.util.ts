import PDFDocument from 'pdfkit';
import { TaxReceipt } from '@tms/types';

export function generateReceiptPdf(receipt: TaxReceipt): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text(receipt.templeName, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).text('OFFICIAL RECEIPT', { align: 'center' });
    doc.moveDown(1.5);

    doc.fontSize(11);
    doc.text(`Receipt No:  ${receipt.receiptNumber}`);
    doc.text(`Issued:      ${receipt.issuedAt.slice(0, 10)}`);
    doc.moveDown();
    doc.text(`Amount:      ${receipt.currency} ${receipt.amount.toFixed(2)}`);
    doc.text(`Purpose:     ${receipt.purpose}`);

    if (receipt.taxDocType) {
      doc.text(`Tax Doc:     ${receipt.taxDocType.toUpperCase()}`);
    }
    if (receipt.taxId) {
      doc.text(`Tax ID:      ${receipt.taxId}`);
    }

    doc.moveDown(1.5);
    doc.text('Thank you for your generous support.', { align: 'center' });

    doc.end();
  });
}
