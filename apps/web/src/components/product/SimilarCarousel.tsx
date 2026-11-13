'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard, toCardProps } from '@/components/ui/ProductCard';
import type { CatalogItem } from '@/lib/catalog';

export function SimilarCarousel({ items }: { items: CatalogItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' });

  if (items.length === 0) return null;
  return (
    <section className="mt-12">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Benzer Ürünler</h2>
        <div className="flex gap-2">
          <button onClick={() => scroll(-1)} aria-label="Önceki" className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => scroll(1)} aria-label="Sonraki" className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div ref={ref} className="no-scrollbar -mx-4 mt-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 pt-2">
        {items.map((item) => (
          <div key={item.product.id} className="w-64 shrink-0 snap-start sm:w-72">
            <ProductCard {...toCardProps(item)} />
          </div>
        ))}
      </div>
    </section>
  );
}
