'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GitCompareArrows, ImageOff, Trash2, X } from 'lucide-react';
import { MAX_COMPARE, useCompare } from '@/hooks/useCompare';
import { cn } from '@/lib/utils';

export function CompareFloatingBar() {
  const { items, count, toggle, clear } = useCompare();
  const pathname = usePathname();
  const visible = count > 0 && pathname !== '/karsilastir';
  // keep the bar mounted during the slide-down animation
  const [rendered, setRendered] = useState(visible);
  useEffect(() => {
    if (visible) return setRendered(true);
    const t = setTimeout(() => setRendered(false), 350);
    return () => clearTimeout(t);
  }, [visible]);

  useEffect(() => {
    document.documentElement.style.setProperty('--compare-bar-h', visible ? '5.5rem' : '0px');
  }, [visible]);

  if (!rendered) return null;
  const href = `/karsilastir?slugs=${items.map((i) => encodeURIComponent(i.slug)).join(',')}` as never;

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 shadow-2xl shadow-slate-900/20 backdrop-blur-md transition-transform duration-300 ease-out dark:border-slate-800 dark:bg-slate-900/95',
        visible ? 'translate-y-0' : 'translate-y-full',
      )}
      role="region"
      aria-label="Karşılaştırma listesi"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-5">
        <div className="hidden items-center gap-2 sm:flex">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white"><GitCompareArrows className="h-5 w-5" /></span>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{count} ürün seçildi</p>
            <p className="text-xs text-slate-500">En fazla {MAX_COMPARE} ürün</p>
          </div>
        </div>
        <p className="text-sm font-bold sm:hidden">{count} ürün</p>

        <div className="flex flex-1 items-center gap-2 overflow-x-auto no-scrollbar">
          {items.map((item) => (
            <div key={item.slug} className="group relative h-14 w-14 shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800" title={item.name}>
              {item.image_url ? (
                <Image src={item.image_url} alt={item.name} fill sizes="56px" className="rounded-xl object-contain p-1" />
              ) : (
                <ImageOff className="m-auto h-full w-5 text-slate-300" />
              )}
              <button onClick={() => toggle(item)} aria-label={`${item.name} karşılaştırmadan çıkar`} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white shadow dark:bg-white dark:text-slate-900">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {Array.from({ length: MAX_COMPARE - count }, (_, i) => (
            <div key={`empty-${i}`} className="hidden h-14 w-14 shrink-0 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 sm:block" />
          ))}
        </div>

        <button onClick={clear} className="btn-ghost shrink-0 px-2 text-slate-500 sm:px-3" aria-label="Temizle">
          <Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">Temizle</span>
        </button>
        <Link href={href} className={cn('btn-gradient shrink-0 px-4 py-2.5', count < 2 && 'pointer-events-none opacity-50')} aria-disabled={count < 2}>
          Karşılaştır
        </Link>
      </div>
    </div>
  );
}
