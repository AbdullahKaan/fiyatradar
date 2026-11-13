import type { MasterProduct, PriceAlert, PriceHistory, StoreListing } from '@price-compare/shared';
import { supabase } from './supabase';

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
const PRODUCT_COLUMNS =
  'id, name, slug, category, brand, description, image_url, specs, ai_price_analysis, created_at, updated_at';

export interface SearchItem {
  product: MasterProduct;
  listings: StoreListing[];
}
export interface SearchResponse {
  products: SearchItem[];
  pagination: { page: number; per_page: number; total: number; total_pages: number };
}
export interface SearchOptions {
  minPrice?: number;
  maxPrice?: number;
  sort?: 'deals';
  inStock?: boolean;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) throw new Error('EXPO_PUBLIC_API_URL tanımlı değil.');
  const res = await fetch(`${API_URL}${path}`, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `İstek başarısız (${res.status})`);
  return body as T;
}

export function searchProducts(
  query: string,
  category?: string,
  page = 1,
  opts: SearchOptions = {},
): Promise<SearchResponse> {
  const p = new URLSearchParams();
  if (query.trim()) p.set('q', query.trim());
  if (category) p.set('category', category);
  if (opts.minPrice != null) p.set('min_price', String(opts.minPrice));
  if (opts.maxPrice != null) p.set('max_price', String(opts.maxPrice));
  if (opts.sort) p.set('sort', opts.sort);
  if (opts.inStock) p.set('in_stock', 'true');
  p.set('page', String(page));
  return request<SearchResponse>(`/api/search?${p.toString()}`);
}

/** Fetch a product by slug or UUID. */
export async function getProduct(slugOrId: string): Promise<MasterProduct | null> {
  const isUuid = /^[0-9a-f-]{36}$/i.test(slugOrId);
  const { data, error } = await supabase
    .from('master_products')
    .select(PRODUCT_COLUMNS)
    .eq(isUuid ? 'id' : 'slug', slugOrId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as MasterProduct) ?? null;
}

export async function getProductListings(productId: string): Promise<StoreListing[]> {
  const { data, error } = await supabase
    .from('store_listings')
    .select('*, store:stores(*)')
    .eq('master_product_id', productId)
    .order('current_price', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => ({ ...l, current_price: Number(l.current_price) })) as StoreListing[];
}

export async function getPriceHistory(productId: string, days = 90): Promise<PriceHistory[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await supabase
    .from('price_history')
    .select('*')
    .eq('master_product_id', productId)
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((h) => ({ ...h, price: Number(h.price) })) as PriceHistory[];
}

export async function askAssistant(question: string, productId?: string): Promise<string> {
  const res = await request<{ answer: string }>('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, product_id: productId }),
  });
  return res.answer;
}

export interface AlertWithPrice extends PriceAlert {
  best_price: number | null;
}

export async function getMyAlerts(): Promise<AlertWithPrice[]> {
  const { data, error } = await supabase
    .from('price_alerts')
    .select(`*, master_product:master_products(${PRODUCT_COLUMNS}, store_listings(current_price, in_stock))`)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((a) => {
    const listings = ((a.master_product?.store_listings ?? []) as { current_price: number; in_stock: boolean }[])
      .filter((l) => l.in_stock)
      .map((l) => Number(l.current_price));
    return { ...a, target_price: Number(a.target_price), best_price: listings.length ? Math.min(...listings) : null };
  }) as AlertWithPrice[];
}

export async function createAlert(productId: string, targetPrice: number): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error('Alarm kurmak için giriş yapmalısınız.');
  const { error } = await supabase.from('price_alerts').insert({
    user_id: u.user.id,
    master_product_id: productId,
    target_price: targetPrice,
    currency: 'TRY',
    is_active: true,
  });
  if (error) throw new Error(error.message);
}

export async function deleteAlert(id: string): Promise<void> {
  const { error } = await supabase.from('price_alerts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export function bestListing(listings: StoreListing[]): StoreListing | undefined {
  const sorted = [...listings].sort((a, b) => a.current_price - b.current_price);
  return sorted.find((l) => l.in_stock) ?? sorted[0];
}
