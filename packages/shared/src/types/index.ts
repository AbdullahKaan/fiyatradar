export interface Store {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string;
  reliability_score: number; // 0-100
  affiliate_param_template: string | null; // e.g. "?aff={AFFILIATE_TAG}"
  is_active: boolean;
  created_at: string;
}

export interface MasterProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  brand: string;
  description: string | null;
  image_url: string | null;
  specs: Record<string, unknown>; // JSONB
  embedding: number[] | null; // pgvector - 768 dims
  ai_price_analysis: AIPriceAnalysis | null;
  created_at: string;
  updated_at: string;
}

export interface AIPriceAnalysis {
  verdict: 'BUY_NOW' | 'WAIT' | 'OVERPRICED' | 'GOOD_DEAL';
  verdict_tr: string;
  summary: string;
  lowest_6m: number;
  highest_6m: number;
  current_vs_avg_percent: number; // negative = below avg = good
  fake_discount_detected: boolean;
  analyzed_at: string;
}

export interface StoreListing {
  id: string;
  master_product_id: string;
  store_id: string;
  store: Store;
  current_price: number;
  original_price: number | null;
  discount_percent: number | null;
  currency: string; // 'TRY' | 'USD' | 'EUR'
  in_stock: boolean;
  affiliate_url: string;
  product_url: string;
  last_updated: string;
}

export interface PriceHistory {
  id: string;
  store_listing_id: string;
  master_product_id: string;
  store_id: string;
  price: number;
  currency: string;
  recorded_at: string;
}

export interface PriceAlert {
  id: string;
  user_id: string;
  master_product_id: string;
  master_product: MasterProduct;
  target_price: number;
  currency: string;
  is_active: boolean;
  triggered_at: string | null;
  created_at: string;
}

export interface SearchResult {
  products: MasterProduct[];
  listings: StoreListing[];
  total: number;
  page: number;
  per_page: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  products?: MasterProduct[];
}

export type ProductCategory =
  | 'Elektronik'
  | 'Bilgisayar'
  | 'Telefon'
  | 'Ev Aletleri'
  | 'Giyim'
  | 'Kozmetik'
  | 'Spor'
  | 'Kitap'
  | 'Oyun'
  | 'Genel';

export const PRODUCT_CATEGORIES: readonly ProductCategory[] = [
  'Elektronik',
  'Bilgisayar',
  'Telefon',
  'Ev Aletleri',
  'Giyim',
  'Kozmetik',
  'Spor',
  'Kitap',
  'Oyun',
  'Genel',
] as const;

export type Currency = 'TRY' | 'USD' | 'EUR';

export interface TopDeal {
  product: MasterProduct;
  listing: StoreListing;
}
