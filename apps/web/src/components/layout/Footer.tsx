import Link from 'next/link';

const PAGES = [
  { href: '/', label: 'Ana Sayfa' },
  { href: '/ara', label: 'Ara' },
  { href: '/favoriler', label: 'Favoriler' },
  { href: '/alarmlar', label: 'Alarmlar' },
] as const;

const STORES = [
  { href: 'https://www.hepsiburada.com', label: 'Hepsiburada' },
  { href: 'https://www.trendyol.com', label: 'Trendyol' },
  { href: 'https://www.amazon.com.tr', label: 'Amazon TR' },
];

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-black text-white">F</span>
            <span className="text-xl font-extrabold text-white">FiyatRadar</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed">Türkiye&apos;nin AI destekli fiyat karşılaştırma platformu</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Sayfalar</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {PAGES.map((p) => (
              <li key={p.href}><Link href={p.href} className="transition hover:text-white">{p.label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Mağazalar</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {STORES.map((s) => (
              <li key={s.label}><a href={s.href} target="_blank" rel="noopener noreferrer" className="transition hover:text-white">{s.label}</a></li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Hakkında</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href={'/#nasil-calisir' as never} className="transition hover:text-white">Nasıl Çalışır</Link></li>
            <li><Link href="/gizlilik" className="transition hover:text-white">Gizlilik Politikası</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800">
        <p className="mx-auto max-w-7xl px-4 py-6 text-center text-xs">© 2024 FiyatRadar - Fiyatlar otomatik güncellenir.</p>
      </div>
    </footer>
  );
}
