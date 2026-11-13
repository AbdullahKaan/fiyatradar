'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ExternalLink, GitCompareArrows, ImageOff, Loader2, Trash2, X } from 'lucide-react';
import { AIVerdictBadge } from '@/components/ui/AIVerdictBadge';
import { useCompare } from '@/hooks/useCompare';
import { fetchCatalogBySlugs, type CatalogItem } from '@/lib/catalog';
import { getBrowserSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { bestListing, cn, formatPrice, storeTheme } from '@/lib/utils';

function CompareContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { items: compareItems, clear, toggle } = useCompare();
  const paramSlugs = (params.get('slugs') ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 3);
  // Fall back to the saved compare list when opened without ?slugs=
  const slugs = paramSlugs.length ? paramSlugs : compareItems.map((i) => i.slug);
  const key = slugs.join(',');

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!key) {
      setItems([]);
      setLoading(false);
      return;
    }
    if (!isSupabaseConfigured()) {
      setError('Veritabanı bağlantısı yapılandırılmamış.');
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchCatalogBySlugs(getBrowserSupabase(), key.split(','))
      .then((d) => !cancelled && (setItems(d), setError(null)))
      .catch((e: Error) => !cancelled && setError(`Ürünler yüklenemedi: ${e.message}`))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [key]);

  const storeNames = useMemo(
    () => Array.from(new Set(items.flatMap((i) => i.listings.map((l) => l.store?.name ?? 'Mağaza')))).sort(),
    [items],
  );
  const cheapestOverall = useMemo(() => {
    const prices = items.map((i) => bestListing(i.listings)?.current_price).filter((p): p is number => p != null);
    return prices.length ? Math.min(...prices) : null;
  }, [items]);

  const removeOne = (slug: string) => {
    const item = compareItems.find((c) => c.slug === slug);
    if (item) toggle(item);
    const rest = slugs.filter((s) => s !== slug);
    router.replace((rest.length ? `/karsilastir?slugs=${rest.join(',')}` : '/karsilastir') as never);
  };

  const clearAll = () => {
    clear();
    router.replace('/karsilastir' as never);
  };

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-indigo-50 to-violet-100 dark:from-indigo-500/10 dark:to-violet-500/10">
          <GitCompareArrows className="h-14 w-14 text-indigo-500" />
        </div>
        <h2 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">Karşılaştırılacak ürün yok</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">Ürün kartlarındaki &ldquo;Karşılaştır&rdquo; kutusunu işaretleyerek en fazla 3 ürünü yan yana inceleyin.</p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <Link href="/" className="btn-gradient mt-6 px-6 py-3">Ürünleri Keşfet</Link>
      </div>
    );
  }

  const cell = 'px-4 py-4 align-top text-sm';
  const rowLabel = 'sticky left-0 z-10 w-40 min-w-[9rem] bg-slate-50 px-4 py-4 text-left align-top text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800';

  return (
    <>
      <div className="flex justify-end">
        <button onClick={clearAll} className="btn-ghost border border-slate-200 text-slate-600 dark:border-slate-700">
          <Trash2 className="h-4 w-4" /> Temizle
        </button>
      </div>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800">
              <th className={rowLabel}>Ürün</th>
              {items.map(({ product }) => (
                <th key={product.id} className="relative px-4 py-5 text-left align-top font-normal">
                  <button onClick={() => removeOne(product.slug)} aria-label="Karşılaştırmadan çıkar" className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-rose-500 hover:text-white dark:bg-slate-800">
                    <X className="h-4 w-4" />
                  </button>
                  <Link href={`/urun/${product.slug}` as never} className="group block">
                    <div className="relative mx-auto aspect-square w-full max-w-[180px] rounded-xl bg-slate-50 dark:bg-slate-800">
                      {product.image_url ? (
                        <Image src={product.image_url} alt={product.name} fill sizes="180px" className="object-contain p-4 transition group-hover:scale-105" />
                      ) : (
                        <ImageOff className="m-auto h-full w-8 text-slate-300" />
                      )}
                    </div>
                    <p className="mt-3 line-clamp-2 font-semibold text-slate-900 group-hover:text-indigo-600 dark:text-white">{product.name}</p>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            <tr>
              <th className={rowLabel}>En Düşük Fiyat</th>
              {items.map((i) => {
                const best = bestListing(i.listings);
                const isCheapest = best && best.current_price === cheapestOverall && items.length > 1;
                return (
                  <td key={i.product.id} className={cell}>
                    <span className="text-gradient text-xl font-extrabold">{formatPrice(best?.current_price)}</span>
                    {isCheapest && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">EN UCUZ</span>}
                  </td>
                );
              })}
            </tr>
            {storeNames.map((store) => (
              <tr key={store}>
                <th className={rowLabel}>
                  <span className="flex items-center gap-2 normal-case"><span className={cn('h-2.5 w-2.5 rounded-full', storeTheme(store).dot)} />{store}</span>
                </th>
                {items.map((i) => {
                  const l = i.listings.find((x) => (x.store?.name ?? 'Mağaza') === store);
                  return (
                    <td key={i.product.id} className={cell}>
                      {l ? (
                        <a href={l.affiliate_url || l.product_url} target="_blank" rel="noopener sponsored" className="inline-flex items-center gap-1 font-semibold text-slate-800 hover:text-indigo-600 dark:text-slate-200">
                          {formatPrice(l.current_price, l.currency)} <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <th className={rowLabel}>AI Kararı</th>
              {items.map((i) => (
                <td key={i.product.id} className={cell}>
                  {i.product.ai_price_analysis ? (
                    <>
                      <AIVerdictBadge verdict={i.product.ai_price_analysis.verdict} />
                      <p className="mt-2 text-xs leading-relaxed text-slate-500">{i.product.ai_price_analysis.summary}</p>
                    </>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <th className={rowLabel}>Kategori</th>
              {items.map((i) => <td key={i.product.id} className={cell}>{i.product.category}</td>)}
            </tr>
            <tr>
              <th className={rowLabel}>Marka</th>
              {items.map((i) => <td key={i.product.id} className={cn(cell, 'font-medium')}>{i.product.brand || '—'}</td>)}
            </tr>
            <tr>
              <th className={rowLabel}>En Düşük 6 Ay</th>
              {items.map((i) => <td key={i.product.id} className={cn(cell, 'font-semibold text-emerald-600 dark:text-emerald-400')}>{formatPrice(i.product.ai_price_analysis?.lowest_6m)}</td>)}
            </tr>
            <tr>
              <th className={rowLabel}>En Yüksek 6 Ay</th>
              {items.map((i) => <td key={i.product.id} className={cn(cell, 'font-semibold text-rose-600 dark:text-rose-400')}>{formatPrice(i.product.ai_price_analysis?.highest_6m)}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </>
  );
}

export default function ComparePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="flex items-center gap-2 text-3xl font-extrabold text-slate-900 dark:text-white">
        <GitCompareArrows className="h-7 w-7 text-indigo-600" /> Ürün Karşılaştırma
      </h1>
      <p className="mt-1 text-sm text-slate-500">Seçtiğiniz ürünlerin fiyatlarını ve AI analizlerini yan yana görün.</p>
      <div className="mt-6">
        <Suspense fallback={<div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>}>
          <CompareContent />
        </Suspense>
      </div>
    </div>
  );
}
