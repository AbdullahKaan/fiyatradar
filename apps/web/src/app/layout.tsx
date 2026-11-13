import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CompareFloatingBar } from '@/components/ui/CompareFloatingBar';
import { AIChat } from '@/components/ai-chat';

const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'FiyatRadar - AI Destekli Fiyat Karşılaştırma', template: '%s | FiyatRadar' },
  description:
    "Türkiye'nin AI destekli fiyat karşılaştırma platformu. Hepsiburada, Trendyol ve Amazon fiyatlarını karşılaştırın, sahte indirimleri yakalayın, fiyat alarmı kurun.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: { locale: 'tr_TR', type: 'website', siteName: 'FiyatRadar' },
};

export const viewport: Viewport = {
  themeColor: process.env.NEXT_PUBLIC_THEME_COLOR || '#6366F1',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={inter.variable} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-slate-50 pb-[var(--compare-bar-h,0px)] font-sans dark:bg-slate-950">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <CompareFloatingBar />
          <AIChat />
        </Providers>
      </body>
    </html>
  );
}
