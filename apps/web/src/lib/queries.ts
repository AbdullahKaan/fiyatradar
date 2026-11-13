import type { SupabaseClient } from '@supabase/supabase-js';
import { PRODUCT_COLUMNS, type MasterProduct, type StoreListing } from '@price-compare/shared';

export interface SearchFilters {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  storeId?: string;
  inStock?: boolean;
  page?: number;
  perPage?: number;
}

export interface SearchItem {
  product: MasterProduct;
  listings: StoreListing[];
}

export interface SearchResponse {
  products: SearchItem[];
  pagination: { page: number; per_page: number; total: number; total_pages: number };
}

const num = (v: string | null | undefined): number | undefined => {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

export function parseFilters(get: (key: string) => string | null | undefined): SearchFilters {
  return {
    q: get('q')?.trim() || undefined,
    category: get('category') || undefined,
    minPrice: num(get('min_price')),
    maxPrice: num(get('max_price')),
    storeId: get('store_id') || undefined,
    inStock: get('in_stock') === 'true' || get('in_stock') === '1' ? true : undefined,
    page: Math.max(1, Math.floor(num(get('page')) ?? 1)),
  };
}

function sanitize(term: string): string {
  return term.replace(/[%_\\]/g, (m) => `\\${m}`).replace(/[,()]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Product search joined with listings (inner join so listing filters restrict products). */
export async function searchCatalog(supabase: SupabaseClient, f: SearchFilters): Promise<SearchResponse> {
  const page = f.page ?? 1;
  const perPage = Math.min(48, f.perPage ?? 24);
  const from = (page - 1) * perPage;

  const hasListingFilter = f.minPrice != null || f.maxPrice != null || f.storeId || f.inStock;
  const join = hasListingFilter ? 'store_listings!inner' : 'store_listings';
  let query = supabase
    .from('master_products')
    .select(`${PRODUCT_COLUMNS}, store_listings:${join}(*, store:stores(*))`, { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(from, from + perPage - 1);

  const term = f.q ? sanitize(f.q) : '';
  if (term) {
    const p = `%${term}%`;
    query = query.or(`name.ilike.${p},brand.ilike.${p},category.ilike.${p}`);
  }
  if (f.category) query = query.eq('category', f.category);
  if (f.minPrice != null) query = query.gte('store_listings.current_price', f.minPrice);
  if (f.maxPrice != null) query = query.lte('store_listings.current_price', f.maxPrice);
  if (f.storeId) query = query.eq('store_listings.store_id', f.storeId);
  if (f.inStock) query = query.eq('store_listings.in_stock', true);

  const { data, error, count } = await query;
  if (error) throw new Error(`Arama başarısız: ${error.message}`);

  const products: SearchItem[] = (data ?? []).map((raw) => {
    const { store_listings, ...rest } = raw as Record<string, unknown> & { store_listings?: Record<string, unknown>[] };
    const listings = (store_listings ?? [])
      .map((l) => ({
        ...(l as unknown as StoreListing),
        current_price: Number(l.current_price),
        original_price: l.original_price == null ? null : Number(l.original_price),
        discount_percent: l.discount_percent == null ? null : Number(l.discount_percent),
      }))
      .sort((a, b) => a.current_price - b.current_price);
    const product = { ...(rest as unknown as MasterProduct), specs: (rest.specs as Record<string, unknown>) ?? {}, embedding: null };
    return { product, listings };
  });

  const total = count ?? products.length;
  return { products, pagination: { page, per_page: perPage, total, total_pages: Math.max(1, Math.ceil(total / perPage)) } };
}
