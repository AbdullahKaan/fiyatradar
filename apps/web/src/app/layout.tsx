import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { AIChat } from '@/components/ai-chat';

const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'FiyatRadar - Akıllı Fiyat Karşılaştırma', template: '%s | FiyatRadar' },
  description:
    "Türkiye'nin AI destekli fiyat karşılaştırma platformu. Hepsiburada, Trendyol ve Amazon fiyatlarını karşılaştırın, sahte indirimleri yakalayın, fiyat alarmı kurun.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  openGraph: { locale: 'tr_TR', type: 'website', siteName: 'FiyatRadar' },
};

export const viewport: Viewport = {
  themeColor: process.env.NEXT_PUBLIC_THEME_COLOR || '#6366F1',
  width: 'device-width',
  initialScale: 1,
};

const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-screen flex-col font-sans">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <AIChat />
      </body>
    </html>
  );
}
