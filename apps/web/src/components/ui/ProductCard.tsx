'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Heart, ImageOff, X } from 'lucide-react';
import type { MasterProduct } from '@price-compare/shared';
import { AIVerdictBadge } from './AIVerdictBadge';
import { useFavorites } from '@/hooks/useFavorites';
import { useCompare } from '@/hooks/useCompare';
import type { CatalogItem } from '@/lib/catalog';
import { bestListing, cn, formatPrice } from '@/lib/utils';

export interface CardStore {
  store_name: string;
  price: number;
  url: string;
}

export interface ProductCardProps {
  product: Pick<MasterProduct, 'name' | 'slug' | 'image_url' | 'brand' | 'category' | 'ai_price_analysis'>;
  bestPrice: number | null;
  stores: CardStore[];
  /** Highest real discount % (shown as a ribbon when > 0). */
  discount?: number;
  onRemove?: () => void;
}

export function toCardProps(item: CatalogItem): Omit<ProductCardProps, 'onRemove'> {
  const best = bestListing(item.listings);
  const fake = item.product.ai_price_analysis?.fake_discount_detected;
  return {
    product: item.product,
    bestPrice: best?.current_price ?? null,
    stores: item.listings.map((l) => ({ store_name: l.store?.name ?? 'Mağaza', price: l.current_price, url: l.affiliate_url || l.product_url })),
    discount: fake ? 0 : Math.max(0, ...item.listings.map((l) => l.discount_percent ?? 0)),
  };
}

export function ProductCard({ product, bestPrice, stores, discount = 0, onRemove }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const { toggle: toggleFav, isFavorite } = useFavorites();
  const { toggle: toggleCompare, isComparing, isFull } = useCompare();
  const fav = isFavorite(product.slug);
  const comparing = isComparing(product.slug);
  const href = `/urun/${product.slug}` as never;
  const sortedStores = [...stores].sort((a, b) => a.price - b.price);

  return (
    <article className="group relative flex h-full animate-fade-up flex-col rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 dark:border-slate-800 dark:bg-slate-900">
      <Link href={href} className="relative block aspect-square overflow-hidden rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
        {product.image_url && !imgError ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300"><ImageOff className="h-10 w-10" /></div>
        )}
        {product.brand && (
          <span className="absolute left-2 top-2 rounded-full bg-slate-100/95 px-2.5 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur dark:bg-slate-700/90 dark:text-slate-200">{product.brand}</span>
        )}
        <AIVerdictBadge verdict={product.ai_price_analysis?.verdict} className="absolute right-2 top-2 shadow-sm" />
        {discount >= 1 && (
          <span className="absolute bottom-2 left-2 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 px-2 py-0.5 text-xs font-bold text-white shadow">-%{Math.round(discount)}</span>
        )}
      </Link>

      {onRemove && (
        <button onClick={onRemove} aria-label="Favorilerden çıkar" className="absolute -right-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-md ring-1 ring-slate-200 transition hover:bg-rose-500 hover:text-white dark:bg-slate-800 dark:ring-slate-700">
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="flex flex-1 flex-col px-1 pt-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{product.category}</p>
        <Link href={href}>
          <h3 className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-5 text-slate-900 transition group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">{product.name}</h3>
        </Link>

        <div className="mt-3">
          <p className="text-[11px] text-slate-500">En düşük fiyat</p>
          <p className="text-gradient text-2xl font-extrabold tracking-tight">{formatPrice(bestPrice)}</p>
        </div>

        {sortedStores.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            {sortedStores.slice(0, 3).map((s) => (
              <span key={s.store_name} className="whitespace-nowrap">
                {s.store_name} <span className="font-semibold text-slate-700 dark:text-slate-200">{formatPrice(s.price)}</span>
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center gap-2 pt-4">
          <button
            onClick={() => toggleFav(product.slug)}
            aria-label={fav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
            aria-pressed={fav}
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition',
              fav ? 'border-rose-200 bg-rose-50 text-rose-500 dark:border-rose-500/30 dark:bg-rose-500/10' : 'border-slate-200 text-slate-400 hover:border-rose-200 hover:text-rose-500 dark:border-slate-700',
            )}
          >
            <Heart className={cn('h-4 w-4', fav && 'fill-current')} />
          </button>
          <label
            className={cn(
              'flex h-9 cursor-pointer select-none items-center gap-1.5 rounded-xl border px-2 text-xs font-medium transition',
              comparing ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300' : 'border-slate-200 text-slate-600 hover:border-indigo-200 dark:border-slate-700 dark:text-slate-300',
              !comparing && isFull && 'cursor-not-allowed opacity-50',
            )}
            title={!comparing && isFull ? 'En fazla 3 ürün karşılaştırabilirsiniz' : undefined}
          >
            <input
              type="checkbox"
              checked={comparing}
              disabled={!comparing && isFull}
              onChange={() => toggleCompare({ slug: product.slug, name: product.name, image_url: product.image_url })}
              className="h-3.5 w-3.5 accent-indigo-600"
            />
            Karşılaştır
          </label>
          <Link href={href} className="btn-gradient ml-auto h-9 px-3 text-xs">
            İncele <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-2xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="skeleton aspect-square rounded-xl" />
          <div className="skeleton mt-4 h-4 w-3/4" />
          <div className="skeleton mt-2 h-4 w-1/2" />
          <div className="skeleton mt-4 h-7 w-2/3" />
          <div className="skeleton mt-4 h-9 w-full" />
        </div>
      ))}
    </div>
  );
}
