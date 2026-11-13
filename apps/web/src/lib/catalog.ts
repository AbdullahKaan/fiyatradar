import type { SupabaseClient } from '@supabase/supabase-js';
import { PRODUCT_COLUMNS, type AIPriceAnalysis, type MasterProduct, type StoreListing } from '@price-compare/shared';

export interface CatalogItem {
  product: MasterProduct;
  listings: StoreListing[];
}

export const CATALOG_SELECT = `${PRODUCT_COLUMNS}, store_listings(*, store:stores(*))`;

/** Normalize a master_products row with embedded store_listings (numeric strings -> numbers, sorted by price). */
export function normalizeCatalogRow(raw: unknown): CatalogItem {
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
}

export async function fetchCatalogBySlugs(supabase: SupabaseClient, slugs: string[]): Promise<CatalogItem[]> {
  if (slugs.length === 0) return [];
  const { data, error } = await supabase.from('master_products').select(CATALOG_SELECT).in('slug', slugs);
  if (error) throw new Error(error.message);
  const items = (data ?? []).map(normalizeCatalogRow);
  // keep caller's order
  return slugs.map((s) => items.find((i) => i.product.slug === s)).filter((i): i is CatalogItem => Boolean(i));
}

export async function fetchAllCatalog(supabase: SupabaseClient, limit = 200): Promise<CatalogItem[]> {
  const { data, error } = await supabase.from('master_products').select(CATALOG_SELECT).order('updated_at', { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeCatalogRow);
}

/** Homepage pill -> DB categories it covers. */
export const CATEGORY_PILLS: { label: string; emoji: string; matches: string[] }[] = [
  { label: 'Tümü', emoji: '', matches: [] },
  { label: 'Telefon', emoji: '📱', matches: ['Telefon'] },
  { label: 'Bilgisayar', emoji: '💻', matches: ['Bilgisayar', 'Bilgisayar Aksesuarı', 'Tablet', 'Monitör'] },
  { label: 'TV', emoji: '📺', matches: ['Televizyon', 'TV', 'Monitör'] },
  { label: 'Kulaklık', emoji: '🎧', matches: ['Kulaklık'] },
  { label: 'Oyun', emoji: '🎮', matches: ['Oyun Konsolu', 'Oyun'] },
  { label: 'Saat', emoji: '⌚', matches: ['Akıllı Saat', 'Saat'] },
  { label: 'Kamera', emoji: '📷', matches: ['Kamera', 'Akıllı Ev'] },
  { label: 'Hoparlör', emoji: '🔊', matches: ['Ses Sistemi', 'Hoparlör'] },
];

export function matchesPill(category: string, pill: string): boolean {
  const def = CATEGORY_PILLS.find((p) => p.label === pill);
  if (!def || def.matches.length === 0) return true;
  return def.matches.includes(category);
}

export type Verdict = AIPriceAnalysis['verdict'];
export const VERDICTS: { value: Verdict; label: string; emoji: string; cls: string }[] = [
  { value: 'BUY_NOW', label: 'Şu An Alın', emoji: '✅', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  { value: 'GOOD_DEAL', label: 'İyi Fırsat', emoji: '🔵', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' },
  { value: 'WAIT', label: 'Sahte İndirim', emoji: '🔴', cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' },
  { value: 'OVERPRICED', label: 'Pahalı', emoji: '⚠️', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
];

/** Biggest real (non-fake) discount across a product's listings, 0 if none. */
export function realDiscount(item: CatalogItem): number {
  if (item.product.ai_price_analysis?.fake_discount_detected) return 0;
  return Math.max(0, ...item.listings.map((l) => l.discount_percent ?? 0));
}
