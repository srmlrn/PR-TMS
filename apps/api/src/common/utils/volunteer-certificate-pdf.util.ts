import PDFDocument from 'pdfkit';
import type { VolunteerCertificate } from '@tms/types';

const BADGE_LABELS = {
  bronze: 'Bronze Seva',
  silver: 'Silver Seva',
  gold: 'Gold Seva',
  platinum: 'Platinum Seva',
} as const;

function certificateBody(cert: VolunteerCertificate): string {
  switch (cert.kind) {
    case 'hours_ytd':
      return `In grateful recognition of ${cert.hours ?? 0} hours of selfless temple seva volunteered during ${cert.periodLabel ?? 'this year'}.`;
    case 'hours_quarter':
      return `In grateful recognition of ${cert.hours ?? 0} hours of seva contributed during ${cert.periodLabel ?? 'this quarter'}.`;
    case 'badge_tier':
      return `Awarded the ${BADGE_LABELS[cert.badgeTier ?? 'bronze']} recognition for sustained dedication to temple volunteering.`;
    case 'shift_completion':
      return `With sincere appreciation for completing the "${cert.shiftTitle ?? 'seva shift'}" on ${cert.shiftDate ?? ''}, contributing ${cert.hours ?? 0} hours of service.`;
    case 'event_participation':
      return `With heartfelt thanks for volunteering ${cert.hours ?? 0} hours of seva during ${cert.eventName ?? 'a temple event'}.`;
    case 'seva_appreciation':
    default:
      return 'With heartfelt gratitude for your generous seva and dedication to the temple community.';
  }
}

export function generateVolunteerCertificatePdf(cert: VolunteerCertificate): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', margin: 48 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const innerX = 56;
    const innerW = pageW - 112;

    doc.rect(40, 40, pageW - 80, doc.page.height - 80).lineWidth(2).stroke('#b8860b');
    doc.rect(48, 48, pageW - 96, doc.page.height - 96).lineWidth(0.5).stroke('#d4af37');

    doc.fontSize(22).fillColor('#1a1a1a').text(cert.templeName, innerX, 72, {
      width: innerW,
      align: 'center',
    });

    if (cert.deity) {
      doc.fontSize(11).fillColor('#555').text(`In service of ${cert.deity}`, innerX, 102, {
        width: innerW,
        align: 'center',
      });
    }

    doc.moveDown(1.2);
    doc.fontSize(28).fillColor('#8b4513').text('Certificate of Appreciation', innerX, 130, {
      width: innerW,
      align: 'center',
    });

    doc.fontSize(12).fillColor('#333').text('This is to certify that', innerX, 175, {
      width: innerW,
      align: 'center',
    });

    doc.fontSize(26).fillColor('#000').text(cert.volunteerName, innerX, 200, {
      width: innerW,
      align: 'center',
    });

    doc.fontSize(13).fillColor('#333').text(certificateBody(cert), innerX, 245, {
      width: innerW,
      align: 'center',
      lineGap: 4,
    });

    if (cert.subtitle) {
      doc.fontSize(11).fillColor('#666').text(cert.subtitle, innerX, 310, {
        width: innerW,
        align: 'center',
      });
    }

    doc.fontSize(10).fillColor('#444');
    doc.text(`Certificate No: ${cert.certificateNumber}`, innerX, 360, { width: innerW / 2 });
    doc.text(`Issued: ${cert.issuedAt.slice(0, 10)}`, innerX + innerW / 2, 360, {
      width: innerW / 2,
      align: 'right',
    });

    if (cert.location) {
      doc.fontSize(9).fillColor('#777').text(cert.location, innerX, 390, {
        width: innerW,
        align: 'center',
      });
    }

    doc.fontSize(10).fillColor('#8b4513').text('With gratitude from the temple community', innerX, 420, {
      width: innerW,
      align: 'center',
    });

    doc.end();
  });
}
