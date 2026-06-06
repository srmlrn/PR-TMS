import type { Metadata } from 'next';
import { OrbsBackground } from '@tms/ui';
import './globals.css';

export const metadata: Metadata = {
  title: 'TMS · Sacred Digital',
  description: 'Temple Management System — multi-tenant SaaS for temples worldwide',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <OrbsBackground />
        {children}
      </body>
    </html>
  );
}
