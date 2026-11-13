import type { Metadata } from 'next';
import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { getStores, type Store } from '@price-compare/shared';
import { ProductCard } from '@/components/product-card';
import { getPublicSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { parseFilters, searchCatalog, type SearchResponse } from '@/lib/queries';
import { CATEGORY_OPTIONS, cn } from '@/lib/utils';

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function generateMetadata({ searchParams }: { searchParams: SP }): Metadata {
  const q = first(searchParams.q);
  return { title: q ? `"${q}" fiyatları` : 'Ürün Ara', robots: { index: false } };
}

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const filters = parseFilters((k) => first(searchParams[k]));
  let result: SearchResponse = { products: [], pagination: { page: 1, per_page: 24, total: 0, total_pages: 1 } };
  let stores: Store[] = [];
  let error: string | null = null;

  if (isSupabaseConfigured()) {
    const supabase = getPublicSupabase();
    try {
      [result, stores] = await Promise.all([searchCatalog(supabase, filters), getStores(supabase)]);
    } catch (e) {
      error = (e as Error).message;
    }
  } else {
    error = 'Veritabanı bağlantısı yapılandırılmamış.';
  }

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) { const val = first(v); if (val && k !== 'page') params.set(k, val); }
    params.set('page', String(p));
    return `/ara?${params.toString()}`;
  };
  const { page, total_pages, total } = result.pagination;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold">
        {filters.q ? <>&ldquo;{filters.q}&rdquo; için </> : filters.category ? <>{filters.category} kategorisinde </> : null}
        <span className="text-primary">{total.toLocaleString('tr-TR')}</span> sonuç bulundu
      </h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside>
          <form action="/ara" method="get" className="card sticky top-20 space-y-5 p-5">
            {filters.q && <input type="hidden" name="q" value={filters.q} />}
            <div>
              <label htmlFor="category" className="text-sm font-semibold">Kategori</label>
              <select id="category" name="category" defaultValue={filters.category ?? ''} className="input mt-2">
                <option value="">Tümü</option>
                {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <span className="text-sm font-semibold">Fiyat Aralığı (₺)</span>
              <div className="mt-2 flex gap-2">
                <input name="min_price" type="number" min={0} placeholder="Min" defaultValue={filters.minPrice ?? ''} className="input" aria-label="Minimum fiyat" />
                <input name="max_price" type="number" min={0} placeholder="Max" defaultValue={filters.maxPrice ?? ''} className="input" aria-label="Maksimum fiyat" />
              </div>
            </div>
            <div>
              <label htmlFor="store_id" className="text-sm font-semibold">Mağaza</label>
              <select id="store_id" name="store_id" defaultValue={filters.storeId ?? ''} className="input mt-2">
                <option value="">Tüm Mağazalar</option>
                {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="in_stock" value="true" defaultChecked={filters.inStock} className="h-4 w-4 accent-[rgb(var(--primary))]" />
              Sadece stokta olanlar
            </label>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1">Uygula</button>
              <Link href={(filters.q ? `/ara?q=${encodeURIComponent(filters.q)}` : '/ara') as never} className="btn-ghost">Temizle</Link>
            </div>
          </form>
        </aside>

        <section>
          {error && <div className="card mb-4 border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20">{error}</div>}
          {result.products.length === 0 ? (
            <div className="card p-12 text-center">
              <SearchX className="mx-auto h-12 w-12 text-slate-300" />
              <h2 className="mt-4 text-lg font-semibold">Sonuç bulunamadı</h2>
              <p className="mt-2 text-sm text-slate-500">Daha genel bir terim deneyin veya filtreleri kaldırın. Popüler aramalar:</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {['iPhone 15', 'Samsung Galaxy', 'MacBook', 'AirPods', 'PlayStation 5'].map((s) => (
                  <Link key={s} href={`/ara?q=${encodeURIComponent(s)}` as never} className="rounded-full border border-slate-300 px-3 py-1 text-sm hover:border-primary hover:text-primary dark:border-slate-700">{s}</Link>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {result.products.map(({ product, listings }) => <ProductCard key={product.id} product={product} listings={listings} />)}
              </div>
              {total_pages > 1 && (
                <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Sayfalama">
                  {page > 1 && <Link href={pageHref(page - 1) as never} className="btn-ghost">← Önceki</Link>}
                  {Array.from({ length: total_pages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === total_pages || Math.abs(p - page) <= 2)
                    .map((p, i, arr) => (
                      <span key={p} className="flex items-center">
                        {i > 0 && p - (arr[i - 1] ?? 0) > 1 && <span className="px-1 text-slate-400">…</span>}
                        <Link href={pageHref(p) as never} className={cn('btn-ghost h-9 w-9 p-0', p === page && 'bg-primary text-white hover:bg-primary-dark')} aria-current={p === page ? 'page' : undefined}>{p}</Link>
                      </span>
                    ))}
                  {page < total_pages && <Link href={pageHref(page + 1) as never} className="btn-ghost">Sonraki →</Link>}
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
