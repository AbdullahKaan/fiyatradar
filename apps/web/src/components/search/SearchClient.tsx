'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Slider from '@radix-ui/react-slider';
import { Search, SearchX, SlidersHorizontal, X } from 'lucide-react';
import { ProductCard, toCardProps } from '@/components/ui/ProductCard';
import { CATEGORY_PILLS, VERDICTS, matchesPill, realDiscount, type CatalogItem, type Verdict } from '@/lib/catalog';
import { cn, formatPrice, storeTheme } from '@/lib/utils';

type SortKey = 'price_asc' | 'price_desc' | 'discount' | 'newest';
const SORTS: { value: SortKey; label: string }[] = [
  { value: 'price_asc', label: 'Fiyat (Artan)' },
  { value: 'price_desc', label: 'Fiyat (Azalan)' },
  { value: 'discount', label: 'İndirim %' },
  { value: 'newest', label: 'En Yeni' },
];
const DEFAULT_MAX = 50_000;

interface Props {
  query: string;
  items: CatalogItem[];
  stores: { id: string; name: string }[];
  error: string | null;
  initial: { category: string | null; minPrice: number | null; maxPrice: number | null; storeId: string | null; sort: string | null };
}

/** Map a legacy `?category=` value (DB category or pill label) onto a pill. */
function initialPill(category: string | null): string {
  if (!category) return 'Tümü';
  return CATEGORY_PILLS.find((p) => p.label === category || p.matches.includes(category))?.label ?? 'Tümü';
}

export function SearchClient({ query, items, stores, error, initial }: Props) {
  const router = useRouter();
  const priceCeil = useMemo(() => {
    const max = Math.max(0, ...items.flatMap((i) => i.listings.map((l) => l.current_price)));
    return Math.max(DEFAULT_MAX, Math.ceil(max / 1000) * 1000);
  }, [items]);

  const [q, setQ] = useState(query);
  const [pill, setPill] = useState(initialPill(initial.category));
  const [range, setRange] = useState<[number, number]>([initial.minPrice ?? 0, Math.min(initial.maxPrice ?? priceCeil, priceCeil)]);
  const [verdicts, setVerdicts] = useState<Verdict[]>([]);
  const [storeIds, setStoreIds] = useState<string[]>(initial.storeId ? [initial.storeId] : []);
  const [sort, setSort] = useState<SortKey>(SORTS.some((s) => s.value === initial.sort) ? (initial.sort as SortKey) : 'price_asc');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtersActive = pill !== 'Tümü' || range[0] > 0 || range[1] < priceCeil || verdicts.length > 0 || storeIds.length > 0;

  const results = useMemo(() => {
    const priceOf = (item: CatalogItem) => {
      const listings = storeIds.length ? item.listings.filter((l) => storeIds.includes(l.store_id)) : item.listings;
      return listings.length ? Math.min(...listings.map((l) => l.current_price)) : null;
    };
    const rows = items
      .map((item) => ({ item, price: priceOf(item) }))
      .filter(({ item, price }) => {
        if (price == null) return false;
        if (!matchesPill(item.product.category, pill)) return false;
        if (price < range[0] || price > range[1]) return false;
        if (verdicts.length && !verdicts.includes(item.product.ai_price_analysis?.verdict as Verdict)) return false;
        return true;
      });
    rows.sort((a, b) => {
      switch (sort) {
        case 'price_desc':
          return (b.price ?? 0) - (a.price ?? 0);
        case 'discount':
          return realDiscount(b.item) - realDiscount(a.item);
        case 'newest':
          return new Date(b.item.product.created_at).getTime() - new Date(a.item.product.created_at).getTime();
        default:
          return (a.price ?? 0) - (b.price ?? 0);
      }
    });
    return rows.map((r) => r.item);
  }, [items, pill, range, verdicts, storeIds, sort]);

  const reset = () => {
    setPill('Tümü');
    setRange([0, priceCeil]);
    setVerdicts([]);
    setStoreIds([]);
  };

  const broaden = () => {
    if (filtersActive) reset();
    else router.push('/ara');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    router.push((term ? `/ara?q=${encodeURIComponent(term)}` : '/ara') as never);
  };

  const toggleIn = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const filterPanel = (
    <div className="space-y-7">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Kategori</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {CATEGORY_PILLS.map((p) => (
            <button key={p.label} onClick={() => setPill(p.label)} className={cn('pill px-3 py-1.5 text-xs', pill === p.label ? 'pill-active' : 'pill-inactive')}>
              {p.emoji && <span aria-hidden>{p.emoji}</span>}
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Fiyat Aralığı</h3>
        <p className="mt-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">{formatPrice(range[0])} — {formatPrice(range[1])}</p>
        <Slider.Root
          className="relative mt-4 flex h-5 w-full touch-none select-none items-center"
          min={0}
          max={priceCeil}
          step={500}
          minStepsBetweenThumbs={1}
          value={range}
          onValueChange={(v) => setRange([v[0] ?? 0, v[1] ?? priceCeil])}
          aria-label="Fiyat aralığı"
        >
          <Slider.Track className="relative h-1.5 grow rounded-full bg-slate-200 dark:bg-slate-700">
            <Slider.Range className="absolute h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-600" />
          </Slider.Track>
          {[0, 1].map((i) => (
            <Slider.Thumb
              key={i}
              aria-label={i === 0 ? 'Minimum fiyat' : 'Maksimum fiyat'}
              className="block h-5 w-5 rounded-full border-2 border-indigo-600 bg-white shadow-md outline-none transition hover:scale-110 focus-visible:ring-4 focus-visible:ring-indigo-500/30"
            />
          ))}
        </Slider.Root>
        <div className="mt-2 flex justify-between text-[11px] text-slate-400"><span>0 ₺</span><span>{formatPrice(priceCeil)}</span></div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">AI Kararı</h3>
        <div className="mt-3 space-y-2">
          {VERDICTS.map((v) => (
            <label key={v.value} className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={verdicts.includes(v.value)} onChange={() => setVerdicts((l) => toggleIn(l, v.value))} className="h-4 w-4 rounded accent-indigo-600" />
              <span aria-hidden>{v.emoji}</span> {v.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Mağaza</h3>
        <div className="mt-3 space-y-2">
          {stores.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={storeIds.includes(s.id)} onChange={() => setStoreIds((l) => toggleIn(l, s.id))} className="h-4 w-4 rounded accent-indigo-600" />
              <span className={cn('h-2.5 w-2.5 rounded-full', storeTheme(s.name).dot)} aria-hidden />
              {s.name}
            </label>
          ))}
        </div>
      </div>

      {filtersActive && (
        <button onClick={reset} className="btn-ghost w-full border border-slate-200 dark:border-slate-700">
          <X className="h-4 w-4" /> Filtreleri Temizle
        </button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <form onSubmit={submit} role="search" className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900">
        <Search className="ml-2 h-5 w-5 shrink-0 text-slate-400" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          placeholder="Ürün ara... (iPhone, Samsung, PlayStation...)"
          aria-label="Ürün ara"
          className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
        />
        <button type="submit" className="btn-gradient px-6 py-2.5">Ara</button>
      </form>

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">{filterPanel}</div>
        </aside>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {query && <>&ldquo;<span className="font-semibold text-slate-900 dark:text-white">{query}</span>&rdquo; için </>}
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{results.length.toLocaleString('tr-TR')}</span> ürün bulundu
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setFiltersOpen((o) => !o)} className="btn-ghost border border-slate-200 dark:border-slate-700 lg:hidden" aria-expanded={filtersOpen}>
                <SlidersHorizontal className="h-4 w-4" /> Filtreler {filtersActive && <span className="h-2 w-2 rounded-full bg-indigo-600" />}
              </button>
              <label className="sr-only" htmlFor="sort">Sırala</label>
              <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="input w-auto cursor-pointer py-2 pr-8">
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {filtersOpen && <div className="mt-4 animate-fade-up rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:hidden">{filterPanel}</div>}

          {error && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</div>}

          {results.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white p-14 text-center dark:border-slate-800 dark:bg-slate-900">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-50 to-violet-100 dark:from-indigo-500/10 dark:to-violet-500/10">
                <SearchX className="h-12 w-12 text-indigo-500" />
              </div>
              <h2 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">Aradığınız ürün bulunamadı</h2>
              <p className="mt-2 text-sm text-slate-500">Farklı bir terim deneyin veya filtreleri kaldırın.</p>
              <button onClick={broaden} className="btn-gradient mt-6 px-6 py-3">Aramayı genişlet</button>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((item) => <ProductCard key={item.product.id} {...toCardProps(item)} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
