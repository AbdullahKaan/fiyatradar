import Link from 'next/link';
import { Zap } from 'lucide-react';

const GROUPS: { title: string; links: { label: string; href: string }[] }[] = [
  { title: 'Hakkımızda', links: [{ label: 'Biz Kimiz', href: '/' }, { label: 'Nasıl Çalışır?', href: '/#nasil-calisir' }] },
  { title: 'Mağazalar', links: [{ label: 'Hepsiburada', href: '/ara?q=hepsiburada' }, { label: 'Trendyol', href: '/ara?q=trendyol' }, { label: 'Amazon TR', href: '/ara?q=amazon' }] },
  { title: 'Kategoriler', links: [{ label: 'Elektronik', href: '/ara?category=Elektronik' }, { label: 'Telefon', href: '/ara?category=Telefon' }, { label: 'Bilgisayar', href: '/ara?category=Bilgisayar' }] },
  { title: 'Yardım', links: [{ label: 'Fiyat Alarmları', href: '/alarmlar' }, { label: 'Sahte İndirim Tespiti', href: '/#nasil-calisir' }] },
];

export function Footer() {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'FiyatRadar';
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <Link href="/" className="flex items-center gap-1.5 text-lg font-extrabold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white"><Zap className="h-5 w-5" fill="currentColor" /></span>
            {appName}
          </Link>
          <p className="mt-3 text-sm text-slate-500">AI destekli fiyat karşılaştırma platformu</p>
        </div>
        {GROUPS.map((g) => (
          <div key={g.title}>
            <h3 className="text-sm font-semibold">{g.title}</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              {g.links.map((l) => (
                <li key={l.label}><Link href={l.href as never} className="hover:text-primary">{l.label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-200 py-4 text-center text-xs text-slate-500 dark:border-slate-800">
        © {new Date().getFullYear()} {appName}. Tüm hakları saklıdır.
      </div>
    </footer>
  );
}
