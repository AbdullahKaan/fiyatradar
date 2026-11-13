import type { Metadata } from 'next';
import { getStores, type Store } from '@price-compare/shared';
import { SearchClient } from '@/components/search/SearchClient';
import { getPublicSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { parseFilters, searchCatalog } from '@/lib/queries';
import type { CatalogItem } from '@/lib/catalog';

type SP = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function generateMetadata({ searchParams }: { searchParams: SP }): Metadata {
  const q = first(searchParams.q);
  return { title: q ? `"${q}" fiyatları` : 'Ürün Ara', robots: { index: false } };
}

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const filters = parseFilters((k) => first(searchParams[k]));
  let items: CatalogItem[] = [];
  let stores: Store[] = [];
  let error: string | null = null;

  if (isSupabaseConfigured()) {
    const supabase = getPublicSupabase();
    try {
      // Text query runs on the server; category / price / verdict / store / sort filters run client-side.
      const [result, storeList] = await Promise.all([searchCatalog(supabase, { q: filters.q, perPage: 48 }), getStores(supabase)]);
      items = result.products;
      stores = storeList;
    } catch (e) {
      error = (e as Error).message;
    }
  } else {
    error = 'Veritabanı bağlantısı yapılandırılmamış.';
  }

  return (
    <SearchClient
      key={filters.q ?? ''}
      query={filters.q ?? ''}
      items={items}
      stores={stores.map((s) => ({ id: s.id, name: s.name }))}
      error={error}
      initial={{
        category: filters.category ?? null,
        minPrice: filters.minPrice ?? null,
        maxPrice: filters.maxPrice ?? null,
        storeId: filters.storeId ?? null,
        sort: first(searchParams.sort) ?? null,
      }}
    />
  );
}
