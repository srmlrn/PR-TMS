import PDFDocument from 'pdfkit';
import type { DevoteeTaxStatement } from '@tms/types';

const TAX_LABELS = {
  irs_501c3: 'IRS 501(c)(3) Annual Giving Statement',
  '80g': 'Section 80G Annual Donation Statement',
  cra: 'CRA Official Donation Receipt Summary',
} as const;

export function generateTaxStatementPdf(statement: DevoteeTaxStatement): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text(statement.templeName, { align: 'center' });
    if (statement.templeAddress) {
      doc.fontSize(10).fillColor('#555').text(statement.templeAddress, { align: 'center' });
    }
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor('#000').text(TAX_LABELS[statement.taxDocType], { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(11);
    doc.text(`Statement No:  ${statement.statementNumber}`);
    doc.text(`Tax Year:      ${statement.year}`);
    doc.text(`Issued:        ${statement.issuedAt.slice(0, 10)}`);
    doc.text(`Devotee:       ${statement.devoteeName}`);
    if (statement.taxId) {
      doc.text(`Tax ID:        ${statement.taxId}`);
    }
    doc.moveDown();

    doc.fontSize(12).text('Donation summary', { underline: true });
    doc.moveDown(0.5);

    if (statement.donations.length === 0) {
      doc.fontSize(10).text('No itemized donations on file for this period.');
    } else {
      for (const line of statement.donations) {
        doc.fontSize(10).text(
          `${line.date}  ${line.receiptNumber}  ${line.purpose}  ${line.currency} ${line.amount.toFixed(2)}`,
        );
      }
    }

    doc.moveDown(1);
    doc.fontSize(12).text(
      `Total charitable contributions (${statement.year}): ${statement.currency} ${statement.totalAmount.toFixed(2)}`,
      { align: 'right' },
    );

    doc.moveDown(1.5);
    doc.fontSize(9).fillColor('#444').text(
      'No goods or services were provided in exchange for these contributions unless noted on individual receipts. ' +
        'Please retain this statement with your tax records.',
      { align: 'left' },
    );

    doc.end();
  });
}
