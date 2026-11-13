import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  MasterProduct,
  StoreListing,
  PriceHistory,
  SearchResult,
  PriceAlert,
  Store,
  TopDeal,
} from '../types';

/** Product columns without the heavy 768-dim embedding vector. */
export const PRODUCT_COLUMNS =
  'id, name, slug, category, brand, description, image_url, specs, ai_price_analysis, created_at, updated_at';

const LISTING_SELECT = '*, store:stores(*)';

export const DEFAULT_PER_PAGE = 20;

export interface SupabaseConfig {
  url?: string;
  anonKey?: string;
  serviceRoleKey?: string;
}

function readEnv(): Required<SupabaseConfig> {
  // Static references so bundlers (Next.js / Expo) can inline public vars.
  const env = typeof process !== 'undefined' ? process.env : ({} as Record<string, string>);
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL || env.EXPO_PUBLIC_SUPABASE_URL || '',
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY || '',
  };
}

/** Browser / mobile client using the public anon key (RLS enforced). */
export function createSupabaseClient(config: SupabaseConfig = {}): SupabaseClient {
  const env = readEnv();
  const url = config.url || env.url;
  const anonKey = config.anonKey || env.anonKey;
  if (!url || !anonKey) {
    throw new Error(
      'Supabase yapılandırması eksik: NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY tanımlanmalı.',
    );
  }
  return createClient(url, anonKey, {
    auth: { persistSession: typeof window !== 'undefined', autoRefreshToken: true },
  });
}

/** Server-only client using the service role key (bypasses RLS). Never expose to the browser. */
export function createServiceClient(config: SupabaseConfig = {}): SupabaseClient {
  const env = readEnv();
  const url = config.url || env.url;
  const serviceRoleKey = config.serviceRoleKey || env.serviceRoleKey;
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase servis yapılandırması eksik: NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY tanımlanmalı.',
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let defaultClient: SupabaseClient | null = null;

/** Override the client used by the data functions (e.g. an authenticated client in React Native). */
export function setDefaultClient(client: SupabaseClient): void {
  defaultClient = client;
}

export function getDefaultClient(): SupabaseClient {
  if (!defaultClient) defaultClient = createSupabaseClient();
  return defaultClient;
}

function resolve(client?: SupabaseClient): SupabaseClient {
  return client ?? getDefaultClient();
}

/** Escapes characters that have special meaning in PostgREST `or` filters and LIKE patterns. */
function sanitizeSearchTerm(term: string): string {
  return term
    .trim()
    .replace(/[%_\\]/g, (m) => `\\${m}`)
    .replace(/[,()]/g, ' ')
    .replace(/\s+/g, ' ');
}

function normalizeListing(row: Record<string, unknown>): StoreListing {
  return {
    ...(row as unknown as StoreListing),
    current_price: Number(row.current_price),
    original_price: row.original_price == null ? null : Number(row.original_price),
    discount_percent: row.discount_percent == null ? null : Number(row.discount_percent),
  };
}

function normalizeProduct(row: Record<string, unknown>): MasterProduct {
  return {
    ...(row as unknown as MasterProduct),
    specs: (row.specs as Record<string, unknown>) ?? {},
    embedding: (row.embedding as number[] | undefined) ?? null,
  };
}

export async function searchProducts(
  query: string,
  category?: string,
  page: number = 1,
  client?: SupabaseClient,
  perPage: number = DEFAULT_PER_PAGE,
): Promise<SearchResult> {
  const supabase = resolve(client);
  const safePage = Math.max(1, Math.floor(page));
  const from = (safePage - 1) * perPage;
  const to = from + perPage - 1;

  let builder = supabase
    .from('master_products')
    .select(PRODUCT_COLUMNS, { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(from, to);

  const term = sanitizeSearchTerm(query ?? '');
  if (term) {
    const pattern = `%${term}%`;
    builder = builder.or(`name.ilike.${pattern},brand.ilike.${pattern},category.ilike.${pattern}`);
  }
  if (category) builder = builder.eq('category', category);

  const { data, error, count } = await builder;
  if (error) throw new Error(`Ürün araması başarısız: ${error.message}`);

  const products = (data ?? []).map((r) => normalizeProduct(r as Record<string, unknown>));
  let listings: StoreListing[] = [];

  if (products.length > 0) {
    const { data: listingRows, error: listingError } = await supabase
      .from('store_listings')
      .select(LISTING_SELECT)
      .in(
        'master_product_id',
        products.map((p) => p.id),
      )
      .order('current_price', { ascending: true });
    if (listingError) throw new Error(`Mağaza fiyatları alınamadı: ${listingError.message}`);
    listings = (listingRows ?? []).map((r) => normalizeListing(r as Record<string, unknown>));
  }

  return { products, listings, total: count ?? products.length, page: safePage, per_page: perPage };
}

export async function getProductBySlug(
  slug: string,
  client?: SupabaseClient,
): Promise<MasterProduct | null> {
  const { data, error } = await resolve(client)
    .from('master_products')
    .select(PRODUCT_COLUMNS)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`Ürün alınamadı: ${error.message}`);
  return data ? normalizeProduct(data as Record<string, unknown>) : null;
}

export async function getProductListings(
  masterProductId: string,
  client?: SupabaseClient,
): Promise<StoreListing[]> {
  const { data, error } = await resolve(client)
    .from('store_listings')
    .select(LISTING_SELECT)
    .eq('master_product_id', masterProductId)
    .order('in_stock', { ascending: false })
    .order('current_price', { ascending: true });
  if (error) throw new Error(`Mağaza fiyatları alınamadı: ${error.message}`);
  return (data ?? []).map((r) => normalizeListing(r as Record<string, unknown>));
}

export async function getPriceHistory(
  masterProductId: string,
  storeId?: string,
  days: number = 180,
  client?: SupabaseClient,
): Promise<PriceHistory[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  let builder = resolve(client)
    .from('price_history')
    .select('*')
    .eq('master_product_id', masterProductId)
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true });
  if (storeId) builder = builder.eq('store_id', storeId);

  const { data, error } = await builder;
  if (error) throw new Error(`Fiyat geçmişi alınamadı: ${error.message}`);
  return (data ?? []).map((r) => ({ ...(r as PriceHistory), price: Number(r.price) }));
}

export async function getTopDeals(limit: number = 12, client?: SupabaseClient): Promise<TopDeal[]> {
  // Over-fetch so that we can keep only the best listing per product.
  const { data, error } = await resolve(client)
    .from('store_listings')
    .select(`${LISTING_SELECT}, master_product:master_products(${PRODUCT_COLUMNS})`)
    .eq('in_stock', true)
    .not('discount_percent', 'is', null)
    .gt('discount_percent', 0)
    .order('discount_percent', { ascending: false })
    .limit(limit * 4);
  if (error) throw new Error(`Fırsatlar alınamadı: ${error.message}`);

  const seen = new Set<string>();
  const deals: TopDeal[] = [];
  for (const raw of data ?? []) {
    const row = raw as Record<string, unknown>;
    const productRow = row.master_product as Record<string, unknown> | null;
    if (!productRow) continue;
    const product = normalizeProduct(productRow);
    // Skip listings flagged by the AI fake-discount detector.
    if (product.ai_price_analysis?.fake_discount_detected) continue;
    if (seen.has(product.id)) continue;
    seen.add(product.id);
    const { master_product: _omit, ...listingRow } = row;
    deals.push({ product, listing: normalizeListing(listingRow) });
    if (deals.length >= limit) break;
  }
  return deals;
}

export async function createPriceAlert(
  userId: string,
  productId: string,
  targetPrice: number,
  client?: SupabaseClient,
  currency: string = 'TRY',
): Promise<PriceAlert> {
  if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
    throw new Error('Hedef fiyat pozitif bir sayı olmalı.');
  }
  const { data, error } = await resolve(client)
    .from('price_alerts')
    .insert({
      user_id: userId,
      master_product_id: productId,
      target_price: targetPrice,
      currency,
      is_active: true,
    })
    .select(`*, master_product:master_products(${PRODUCT_COLUMNS})`)
    .single();
  if (error) throw new Error(`Fiyat alarmı oluşturulamadı: ${error.message}`);
  return normalizeAlert(data as Record<string, unknown>);
}

function normalizeAlert(row: Record<string, unknown>): PriceAlert {
  return {
    ...(row as unknown as PriceAlert),
    target_price: Number(row.target_price),
    master_product: normalizeProduct((row.master_product as Record<string, unknown>) ?? {}),
  };
}

export async function getUserAlerts(userId: string, client?: SupabaseClient): Promise<PriceAlert[]> {
  const { data, error } = await resolve(client)
    .from('price_alerts')
    .select(`*, master_product:master_products(${PRODUCT_COLUMNS})`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Alarmlar alınamadı: ${error.message}`);
  return (data ?? []).map((r) => normalizeAlert(r as Record<string, unknown>));
}

export async function deleteAlert(alertId: string, client?: SupabaseClient): Promise<void> {
  const { error } = await resolve(client).from('price_alerts').delete().eq('id', alertId);
  if (error) throw new Error(`Alarm silinemedi: ${error.message}`);
}

export async function getCategories(client?: SupabaseClient): Promise<string[]> {
  const { data, error } = await resolve(client)
    .from('master_products')
    .select('category')
    .order('category', { ascending: true })
    .limit(5000);
  if (error) throw new Error(`Kategoriler alınamadı: ${error.message}`);
  const unique = new Set<string>();
  for (const row of data ?? []) {
    const c = (row as { category: string | null }).category;
    if (c) unique.add(c);
  }
  return Array.from(unique).sort((a, b) => a.localeCompare(b, 'tr'));
}

export async function getStores(client?: SupabaseClient): Promise<Store[]> {
  const { data, error } = await resolve(client)
    .from('stores')
    .select('*')
    .eq('is_active', true)
    .order('reliability_score', { ascending: false });
  if (error) throw new Error(`Mağazalar alınamadı: ${error.message}`);
  return (data ?? []).map((r) => ({
    ...(r as Store),
    reliability_score: Number(r.reliability_score),
  }));
}
