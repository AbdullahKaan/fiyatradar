'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PackageSearch } from 'lucide-react';
import { ProductCard, toCardProps } from '@/components/ui/ProductCard';
import { CATEGORY_PILLS, matchesPill, type CatalogItem } from '@/lib/catalog';
import { cn } from '@/lib/utils';

export function HomeDeals({ items }: { items: CatalogItem[] }) {
  const [active, setActive] = useState('Tümü');
  const filtered = useMemo(() => items.filter((i) => matchesPill(i.product.category, active)), [items, active]);

  return (
    <>
      <section className="sticky top-16 z-30 border-b border-slate-100 bg-slate-50/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-4 no-scrollbar" role="tablist" aria-label="Kategoriler">
          {CATEGORY_PILLS.map((p) => (
            <button
              key={p.label}
              role="tab"
              aria-selected={active === p.label}
              onClick={() => setActive(p.label)}
              className={cn('pill', active === p.label ? 'pill-active' : 'pill-inactive')}
            >
              {p.emoji && <span aria-hidden>{p.emoji}</span>}
              {p.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">🔥 Günün Fırsatları</h2>
            <p className="mt-1 text-sm text-slate-500">
              {active === 'Tümü' ? 'Tüm kategoriler' : active} · {filtered.length} ürün · AI ile doğrulanmış fiyatlar
            </p>
          </div>
          <Link href="/ara" className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Tümünü gör →</Link>
        </div>

        {filtered.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((item) => <ProductCard key={item.product.id} {...toCardProps(item)} />)}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <PackageSearch className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-3 text-slate-500">{items.length === 0 ? 'Şu anda ürün verisi yüklenemedi. Fiyatlar 6 saatte bir güncellenir.' : 'Bu kategoride henüz ürün yok.'}</p>
            {items.length > 0 && <button onClick={() => setActive('Tümü')} className="btn-gradient mt-4">Tüm ürünleri göster</button>}
          </div>
        )}
      </section>
    </>
  );
}
