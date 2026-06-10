'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge, Button, GlassCard } from '@tms/ui';
import type { VolunteerCertificate, VolunteerCertificateKind } from '@tms/types';
import { PageIntro } from '@/components/AppPage';
import { ApiBanner } from '@/components/ApiBanner';
import { useAuth } from '@/lib/auth-context';
import { useTenant } from '@/lib/tenant-context';
import { useApi } from '@/lib/api/use-api';
import { downloadApiFile } from '@/lib/api/download-file';
import { formatShortDate } from '@/lib/api/endpoints';
import styles from './certificates.module.css';

const KIND_LABELS: Record<VolunteerCertificateKind, string> = {
  seva_appreciation: 'Appreciation',
  hours_ytd: 'Annual hours',
  hours_quarter: 'Quarterly',
  badge_tier: 'Badge',
  shift_completion: 'Shift',
  event_participation: 'Event',
};

const KIND_VARIANT: Record<
  VolunteerCertificateKind,
  'ok' | 'info' | 'pending' | 'amber'
> = {
  seva_appreciation: 'ok',
  hours_ytd: 'info',
  hours_quarter: 'info',
  badge_tier: 'amber',
  shift_completion: 'pending',
  event_participation: 'ok',
};

function certDetail(cert: VolunteerCertificate): string {
  if (cert.hours != null && cert.periodLabel) {
    return `${cert.hours} hours · ${cert.periodLabel}`;
  }
  if (cert.hours != null) {
    return `${cert.hours} hours logged`;
  }
  if (cert.shiftDate) {
    return formatShortDate(cert.shiftDate);
  }
  return cert.subtitle;
}

export default function VolunteerCertificatesPage() {
  const { accessToken, user } = useAuth();
  const { tenantId, environment } = useTenant();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const { data, loading, error } = useApi((ep) => ep.getVolunteerCertificates());
  const certificates = data?.data ?? [];

  async function handleDownload(cert: VolunteerCertificate) {
    setDownloadingId(cert.id);
    setDownloadError(null);
    try {
      await downloadApiFile({
        path: `/volunteer/certificates/${encodeURIComponent(cert.id)}/file.pdf`,
        filename: `seva-certificate-${cert.certificateNumber}.pdf`,
        tenantId: user?.tenantId ?? tenantId,
        accessToken: accessToken ?? undefined,
        environment,
      });
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <>
      <PageIntro
        subtitle="Download seva appreciation certificates earned from your volunteer hours"
        showTenantContext={false}
      />
      <ApiBanner loading={loading} error={error} />

      <div className={styles.page}>
        <p className={styles.intro}>
          Certificates are issued automatically when you complete shifts and reach seva milestones.
          Sign up and check out of shifts on{' '}
          <Link href="/volunteer/shifts">Volunteering</Link> to earn more.
        </p>

        {downloadError && (
          <p className="tms-t3" style={{ color: 'var(--red)' }}>
            {downloadError}
          </p>
        )}

        <GlassCard title="Your certificates">
          {loading ? (
            <p className={styles.empty}>Loading certificates…</p>
          ) : certificates.length === 0 ? (
            <p className={styles.empty}>
              No certificates yet. Complete a volunteer shift and check out to earn your first
              certificate.
            </p>
          ) : (
            <div className={styles.grid}>
              {certificates.map((cert) => (
                <article key={cert.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <strong className={styles.cardTitle}>{cert.title}</strong>
                    <Badge variant={KIND_VARIANT[cert.kind]}>
                      {KIND_LABELS[cert.kind]}
                    </Badge>
                  </div>
                  <p className={styles.cardMeta}>{certDetail(cert)}</p>
                  <p className={styles.cardMeta}>{cert.subtitle}</p>
                  <div className={styles.cardFooter}>
                    <span className={styles.certNo}>{cert.certificateNumber}</span>
                    <Button
                      size="sm"
                      onClick={() => handleDownload(cert)}
                      disabled={downloadingId === cert.id}
                    >
                      {downloadingId === cert.id ? '…' : 'Download PDF'}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </>
  );
}
