import type { Metadata } from 'next';
import { OrbsBackground } from '@tms/ui';
import { ThemeProvider } from '@/lib/theme-context';
import { ThemeScript } from '@/components/ThemeScript';
import './globals.css';

export const metadata: Metadata = {
  title: 'TMS · Sacred Digital',
  description: 'Temple Management System — multi-tenant SaaS for temples worldwide',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>
          <OrbsBackground />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
