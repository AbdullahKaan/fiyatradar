'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Zap } from 'lucide-react';
import { SearchBar } from './search-bar';
import { ThemeToggle } from './theme-toggle';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/', label: 'Ana Sayfa' },
  { href: '/#kategoriler', label: 'Kategoriler' },
  { href: '/?asistan=1', label: 'AI Asistan' },
  { href: '/alarmlar', label: 'Fiyat Alarmları' },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'FiyatRadar';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-1.5 text-lg font-extrabold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <Zap className="h-5 w-5" fill="currentColor" />
          </span>
          {appName}
        </Link>
        <div className="hidden max-w-md flex-1 md:block">
          <SearchBar showCategory={false} />
        </div>
        <ul className="ml-auto hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href as never}
                className={cn('btn-ghost', pathname === l.href && 'text-primary')}
                onClick={l.label === 'AI Asistan' ? (e) => { e.preventDefault(); window.dispatchEvent(new Event('open-ai-chat')); } : undefined}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <ThemeToggle />
          <button className="btn-ghost h-9 w-9 p-0 lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menü" aria-expanded={open}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>
      {open && (
        <div className="border-t border-slate-200 px-4 pb-4 pt-3 lg:hidden dark:border-slate-800">
          <SearchBar showCategory={false} className="md:hidden" />
          <ul className="mt-3 flex flex-col">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href as never}
                  className="block rounded-lg px-3 py-2 font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={(e) => {
                    if (l.label === 'AI Asistan') { e.preventDefault(); window.dispatchEvent(new Event('open-ai-chat')); }
                    setOpen(false);
                  }}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
