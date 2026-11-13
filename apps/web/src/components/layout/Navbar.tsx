'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Bell, Heart, Home, Menu, Moon, Search, Sun, X } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/', label: 'Ana Sayfa', icon: Home },
  { href: '/ara', label: 'Ara', icon: Search },
  { href: '/favoriler', label: 'Favoriler', icon: Heart },
  { href: '/alarmlar', label: 'Alarmlar', icon: Bell },
] as const;

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('flex items-center gap-2', className)} aria-label="FiyatRadar ana sayfa">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-black text-white shadow-md shadow-indigo-500/30">F</span>
      <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">FiyatRadar</span>
    </Link>
  );
}

function CountBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-pink-500 px-1 text-[10px] font-bold text-white shadow">
      {count > 99 ? '99+' : count}
    </span>
  );
}

function ThemeButton() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === 'dark';
  return (
    <button
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Açık temaya geç' : 'Koyu temaya geç'}
      className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { count } = useFavorites();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-40 w-full transition-all duration-300',
          scrolled
            ? 'border-b border-slate-200/70 bg-white/80 shadow-sm backdrop-blur-md dark:border-slate-800/70 dark:bg-slate-900/80'
            : 'bg-white dark:bg-slate-900',
        )}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <Logo />

          <ul className="hidden items-center gap-1 md:flex">
            {LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'relative rounded-full px-4 py-2 text-sm font-medium transition',
                    isActive(href)
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
                  )}
                >
                  {label}
                  {href === '/favoriler' && count > 0 && (
                    <span className="ml-1.5 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{count}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-1">
            <ThemeButton />
            <Link
              href="/favoriler"
              aria-label={`Favoriler (${count})`}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-rose-500 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Heart className={cn('h-5 w-5', count > 0 && 'fill-rose-500 text-rose-500')} />
              <CountBadge count={count} />
            </Link>
            <button
              onClick={() => setOpen(true)}
              aria-label="Menüyü aç"
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 md:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </nav>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menü">
          <div className="absolute inset-0 animate-fadeIn bg-slate-900/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] animate-slideInRight flex-col bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4 dark:border-slate-800">
              <Logo />
              <button onClick={() => setOpen(false)} aria-label="Menüyü kapat" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ul className="flex-1 space-y-1 p-4">
              {LINKS.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition',
                      isActive(href)
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                    {href === '/favoriler' && count > 0 && <span className="ml-auto rounded-full bg-rose-500 px-2 text-xs font-bold text-white">{count}</span>}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="border-t border-slate-100 p-4 text-xs text-slate-400 dark:border-slate-800">AI destekli fiyat karşılaştırma</p>
          </aside>
        </div>
      )}
    </>
  );
}
