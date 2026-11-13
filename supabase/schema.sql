-- FiyatRadar - Supabase PostgreSQL Schema
-- Run in Supabase SQL Editor.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. STORES
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  website_url TEXT NOT NULL,
  reliability_score SMALLINT DEFAULT 70 CHECK (reliability_score BETWEEN 0 AND 100),
  affiliate_param_template TEXT, -- e.g. "?aff_id={AFFILIATE_TAG}&url={URL}"
  feed_url TEXT,                 -- affiliate XML/JSON feed (optional)
  feed_type TEXT CHECK (feed_type IN ('xml', 'json', 'auto')) DEFAULT 'auto',
  scrape_config JSONB DEFAULT '{}', -- {"list_urls": [...], "selectors": {...}} for Playwright fallback
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MASTER_PRODUCTS
CREATE TABLE IF NOT EXISTS master_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL DEFAULT 'Genel',
  brand TEXT NOT NULL DEFAULT '',
  description TEXT,
  image_url TEXT,
  specs JSONB DEFAULT '{}',
  embedding vector(768),
  ai_price_analysis JSONB,
  view_count INT DEFAULT 0,
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(brand, '')), 'B')
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. STORE_LISTINGS
CREATE TABLE IF NOT EXISTS store_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  master_product_id UUID NOT NULL REFERENCES master_products(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  current_price NUMERIC(12,2) NOT NULL,
  original_price NUMERIC(12,2),
  discount_percent NUMERIC(5,2),
  currency CHAR(3) DEFAULT 'TRY',
  in_stock BOOLEAN DEFAULT TRUE,
  affiliate_url TEXT,
  product_url TEXT NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(master_product_id, store_id)
);

-- 4. PRICE_HISTORY
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_listing_id UUID NOT NULL REFERENCES store_listings(id) ON DELETE CASCADE,
  master_product_id UUID NOT NULL,
  store_id UUID NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  original_price NUMERIC(12,2),
  currency CHAR(3) DEFAULT 'TRY',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PRICE_ALERTS
CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  master_product_id UUID NOT NULL REFERENCES master_products(id) ON DELETE CASCADE,
  target_price NUMERIC(12,2) NOT NULL,
  currency CHAR(3) DEFAULT 'TRY',
  is_active BOOLEAN DEFAULT TRUE,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_master_products_specs ON master_products USING GIN (specs);
CREATE INDEX IF NOT EXISTS idx_master_products_embedding ON master_products
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at ON price_history (recorded_at);
CREATE INDEX IF NOT EXISTS idx_price_history_listing ON price_history (store_listing_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history (master_product_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_listings_product_store ON store_listings (master_product_id, store_id);
CREATE INDEX IF NOT EXISTS idx_store_listings_last_updated ON store_listings (last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_master_products_category_brand ON master_products (category, brand);
CREATE INDEX IF NOT EXISTS idx_master_products_fts ON master_products USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON price_alerts (user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts (master_product_id) WHERE is_active;

-- UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_master_products_updated_at ON master_products;
CREATE TRIGGER trg_master_products_updated_at
  BEFORE UPDATE ON master_products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ROW LEVEL SECURITY
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read stores" ON stores;
CREATE POLICY "Public read stores" ON stores FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read master_products" ON master_products;
CREATE POLICY "Public read master_products" ON master_products FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read store_listings" ON store_listings;
CREATE POLICY "Public read store_listings" ON store_listings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read price_history" ON price_history;
CREATE POLICY "Public read price_history" ON price_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users select own alerts" ON price_alerts;
CREATE POLICY "Users select own alerts" ON price_alerts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own alerts" ON price_alerts;
CREATE POLICY "Users insert own alerts" ON price_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own alerts" ON price_alerts;
CREATE POLICY "Users update own alerts" ON price_alerts FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own alerts" ON price_alerts;
CREATE POLICY "Users delete own alerts" ON price_alerts FOR DELETE USING (auth.uid() = user_id);
-- service_role bypasses RLS (used by scraper).

-- VECTOR SIMILARITY SEARCH (used by scraper + RAG)
CREATE OR REPLACE FUNCTION match_master_products(
  query_embedding vector(768),
  match_threshold FLOAT DEFAULT 0.88,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID, name TEXT, slug TEXT, category TEXT, brand TEXT,
  image_url TEXT, specs JSONB, ai_price_analysis JSONB, similarity FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT mp.id, mp.name, mp.slug, mp.category, mp.brand, mp.image_url, mp.specs,
         mp.ai_price_analysis, 1 - (mp.embedding <=> query_embedding) AS similarity
  FROM master_products mp
  WHERE mp.embedding IS NOT NULL
    AND 1 - (mp.embedding <=> query_embedding) >= match_threshold
  ORDER BY mp.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- TOP DEALS (excludes AI-detected fake discounts)
CREATE OR REPLACE FUNCTION get_top_deals(limit_count INT DEFAULT 20)
RETURNS TABLE (
  listing_id UUID, master_product_id UUID, product_name TEXT, product_slug TEXT,
  image_url TEXT, category TEXT, brand TEXT, store_id UUID, store_name TEXT,
  store_logo_url TEXT, current_price NUMERIC, original_price NUMERIC,
  discount_percent NUMERIC, currency CHAR(3), affiliate_url TEXT, product_url TEXT,
  ai_price_analysis JSONB, last_updated TIMESTAMPTZ
)
LANGUAGE sql STABLE AS $$
  SELECT sl.id, mp.id, mp.name, mp.slug, mp.image_url, mp.category, mp.brand,
         s.id, s.name, s.logo_url, sl.current_price, sl.original_price,
         sl.discount_percent, sl.currency, sl.affiliate_url, sl.product_url,
         mp.ai_price_analysis, sl.last_updated
  FROM store_listings sl
  JOIN master_products mp ON mp.id = sl.master_product_id
  JOIN stores s ON s.id = sl.store_id
  WHERE sl.in_stock = TRUE
    AND s.is_active = TRUE
    AND sl.discount_percent IS NOT NULL
    AND sl.discount_percent > 0
    AND COALESCE((mp.ai_price_analysis->>'fake_discount_detected')::BOOLEAN, FALSE) = FALSE
  ORDER BY sl.discount_percent DESC
  LIMIT limit_count;
$$;

-- PENDING ALERTS (cheapest in-stock price <= target)
CREATE OR REPLACE FUNCTION get_pending_price_alerts()
RETURNS TABLE (
  alert_id UUID, user_id UUID, master_product_id UUID, product_name TEXT,
  target_price NUMERIC, current_price NUMERIC, store_name TEXT, affiliate_url TEXT
)
LANGUAGE sql STABLE AS $$
  SELECT DISTINCT ON (pa.id) pa.id, pa.user_id, pa.master_product_id, mp.name,
         pa.target_price, sl.current_price, s.name, COALESCE(sl.affiliate_url, sl.product_url)
  FROM price_alerts pa
  JOIN master_products mp ON mp.id = pa.master_product_id
  JOIN store_listings sl ON sl.master_product_id = pa.master_product_id AND sl.in_stock
  JOIN stores s ON s.id = sl.store_id
  WHERE pa.is_active AND pa.triggered_at IS NULL AND sl.current_price <= pa.target_price
  ORDER BY pa.id, sl.current_price ASC;
$$;

CREATE OR REPLACE FUNCTION increment_view_count(product_id UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE master_products SET view_count = view_count + 1 WHERE id = product_id;
$$;

-- SEED: Turkish stores
INSERT INTO stores (name, slug, logo_url, website_url, reliability_score, affiliate_param_template, feed_type)
VALUES
  ('Hepsiburada', 'hepsiburada', 'https://kurumsal.hepsiburada.com//assets/hepsiburada-img.jpg',
   'https://www.hepsiburada.com', 90, '?wt_af={AFFILIATE_TAG}', 'auto'),
  ('Trendyol', 'trendyol', 'https://cdn.dsmcdn.com/web/logo/ty-web.svg',
   'https://www.trendyol.com', 88, '?boutiqueId=61&merchantId={AFFILIATE_TAG}', 'auto'),
  ('Amazon TR', 'amazon-tr', 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
   'https://www.amazon.com.tr', 92, '?tag={AFFILIATE_TAG}', 'auto')
ON CONFLICT (slug) DO NOTHING;
