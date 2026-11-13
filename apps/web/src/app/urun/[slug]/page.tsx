import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, Bot, ChevronRight, ExternalLink, TrendingDown, TrendingUp } from 'lucide-react';
import { getPriceHistory, getProductBySlug, getProductListings, type AIPriceAnalysis } from '@price-compare/shared';
import { PriceAlertButton } from '@/components/price-alert-button';
import { ProductGallery } from '@/components/product/ProductGallery';
import { ProductActions } from '@/components/product/ProductActions';
import { PriceHistoryChart } from '@/components/product/PriceHistoryChart';
import { SimilarCarousel } from '@/components/product/SimilarCarousel';
import { CATALOG_SELECT, normalizeCatalogRow, VERDICTS } from '@/lib/catalog';
import { getPublicSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { bestListing, cn, formatPrice, storeTheme, timeAgo } from '@/lib/utils';

export const revalidate = 1800;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  if (!isSupabaseConfigured()) return [];
  const { data } = await getPublicSupabase().from('master_products').select('slug').order('updated_at', { ascending: false }).limit(50);
  return (data ?? []).map((r) => ({ slug: (r as { slug: string }).slug }));
}

async function loadProduct(slug: string) {
  if (!isSupabaseConfigured()) return null;
  const supabase = getPublicSupabase();
  const product = await getProductBySlug(slug, supabase).catch(() => null);
  if (!product) return null;
  const [listings, history, similarRes] = await Promise.all([
    getProductListings(product.id, supabase),
    getPriceHistory(product.id, undefined, 30, supabase),
    supabase.from('master_products').select(CATALOG_SELECT).eq('category', product.category).neq('id', product.id).limit(8),
  ]);
  const similar = (similarRes.data ?? []).map(normalizeCatalogRow);
  return { product, listings: listings.map((l) => ({ ...l, current_price: Number(l.current_price) })), history, similar };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await loadProduct(params.slug);
  if (!data) return { title: 'Ürün bulunamadı' };
  const best = bestListing(data.listings);
  const title = `${data.product.name} Fiyatları`;
  const description = `${data.product.name} en ucuz ${best ? formatPrice(best.current_price) : ''} — ${data.listings.length} mağazada fiyat karşılaştırması, fiyat geçmişi ve AI analizi.`;
  return { title, description, openGraph: { title, description, images: data.product.image_url ? [data.product.image_url] : [] } };
}

const VERDICT_CARD: Record<AIPriceAnalysis['verdict'], string> = {
  BUY_NOW: 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10',
  GOOD_DEAL: 'border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10',
  WAIT: 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10',
  OVERPRICED: 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10',
};

function VerdictCard({ analysis }: { analysis: AIPriceAnalysis | null }) {
  if (!analysis) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50">
        <Bot className="h-5 w-5 text-indigo-500" /> Bu ürün için AI fiyat analizi henüz hazırlanmadı.
      </div>
    );
  }
  const v = VERDICTS.find((x) => x.value === analysis.verdict);
  const diff = Number(analysis.current_vs_avg_percent ?? 0);
  return (
    <section className={cn('overflow-hidden rounded-2xl border', VERDICT_CARD[analysis.verdict])} aria-label="AI Fiyat Analizi">
      {analysis.fake_discount_detected && (
        <div className="flex items-start gap-2 bg-red-600 px-4 py-2.5 text-sm font-medium text-white">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span><strong>Sahte İndirim Uyarısı:</strong> Fiyat, indirimden önce yapay olarak yükseltilmiş görünüyor.</span>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"><Bot className="h-4 w-4 text-indigo-500" /> AI Kararı</p>
          {v && <span className={cn('rounded-full px-3 py-1 text-xs font-bold', v.cls)}>{v.emoji} {v.label}</span>}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{analysis.summary}</p>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-xl bg-white/70 p-2 dark:bg-slate-900/50">
            <dt className="text-slate-500">6 Ay En Düşük</dt>
            <dd className="mt-0.5 font-bold text-emerald-600 dark:text-emerald-400">{formatPrice(analysis.lowest_6m)}</dd>
          </div>
          <div className="rounded-xl bg-white/70 p-2 dark:bg-slate-900/50">
            <dt className="text-slate-500">6 Ay En Yüksek</dt>
            <dd className="mt-0.5 font-bold text-red-600 dark:text-red-400">{formatPrice(analysis.highest_6m)}</dd>
          </div>
          <div className="rounded-xl bg-white/70 p-2 dark:bg-slate-900/50">
            <dt className="text-slate-500">Ortalamaya Göre</dt>
            <dd className={cn('mt-0.5 flex items-center justify-center gap-1 font-bold', diff <= 0 ? 'text-emerald-600' : 'text-red-600')}>
              {diff <= 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}%{Math.abs(diff).toFixed(1)}
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-[11px] text-slate-400">Son analiz: {timeAgo(analysis.analyzed_at)}</p>
      </div>
    </section>
  );
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const data = await loadProduct(params.slug);
  if (!data) notFound();
  const { product, listings, history, similar } = data;
  const sorted = [...listings].sort((a, b) => Number(b.in_stock) - Number(a.in_stock) || a.current_price - b.current_price);
  const best = bestListing(listings);
  const chartStores = listings.map((l) => ({ id: l.store_id, name: l.store?.name ?? 'Mağaza' }));
  const specs = Object.entries(product.specs ?? {}).filter(([, v]) => v != null && typeof v !== 'object');
  const categoryHref = `/ara?category=${encodeURIComponent(product.category)}` as never;

  return (
    <div className="mx-auto max-w-7xl animate-fadeIn px-4 py-6 sm:py-10">
      <div className="grid gap-8 lg:grid-cols-5">
        {/* Left: image (60%) */}
        <div className="lg:col-span-3">
          <div className="lg:sticky lg:top-24">
            <ProductGallery src={product.image_url} alt={product.name} />
          </div>
        </div>

        {/* Right: details (40%) */}
        <div className="space-y-5 lg:col-span-2">
          <nav aria-label="Sayfa yolu" className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
            <Link href="/" className="hover:text-indigo-600">Ana Sayfa</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href={categoryHref} className="hover:text-indigo-600">{product.category}</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="line-clamp-1 font-medium text-slate-700 dark:text-slate-300">{product.name}</span>
          </nav>

          <div>
            <div className="flex flex-wrap gap-2">
              {product.brand && <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">{product.brand}</span>}
              <Link href={categoryHref} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300">{product.category}</Link>
            </div>
            <h1 className="mt-3 text-2xl font-bold leading-tight text-slate-900 dark:text-white">{product.name}</h1>
            {best && (
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-gradient text-3xl font-extrabold tracking-tight">{formatPrice(best.current_price, best.currency)}</span>
                <span className="text-sm text-slate-500">en düşük · {best.store?.name}</span>
              </div>
            )}
          </div>

          <VerdictCard analysis={product.ai_price_analysis} />

          {/* Price comparison table */}
          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Mağaza Fiyatları</h2>
              <span className="text-xs text-slate-500">{sorted.length} mağaza</span>
            </div>
            {sorted.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">Bu ürün için mağaza fiyatı bulunmuyor.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {sorted.map((l) => {
                  const theme = storeTheme(l.store?.name);
                  const isBest = best?.id === l.id;
                  return (
                    <li key={l.id} className={cn('flex items-center gap-3 px-4 py-3', isBest && 'bg-emerald-50/60 dark:bg-emerald-500/5')}>
                      <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', theme.dot)} />
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-sm font-semibold', theme.text)}>{l.store?.name ?? 'Mağaza'}</p>
                        <p className="text-[11px] text-slate-400">{l.in_stock ? 'Stokta' : 'Tükendi'} · {timeAgo(l.last_updated)}</p>
                      </div>
                      <div className="text-right">
                        <p className={cn('text-sm font-bold', isBest ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white')}>{formatPrice(l.current_price, l.currency)}</p>
                        {isBest && <p className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">✓ En Ucuz</p>}
                        {!isBest && l.original_price != null && Number(l.original_price) > l.current_price && (
                          <p className="text-[11px] text-slate-400 line-through">{formatPrice(Number(l.original_price), l.currency)}</p>
                        )}
                      </div>
                      <a
                        href={l.affiliate_url || l.product_url}
                        target="_blank"
                        rel="noopener sponsored"
                        className={cn('inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition', isBest ? 'btn-gradient' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200')}
                      >
                        Siteye Git <span aria-hidden>→</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <ProductActions slug={product.slug} name={product.name} imageUrl={product.image_url} />

          <div className="flex flex-wrap gap-3 pt-2">
            {best && (
              <a href={best.affiliate_url || best.product_url} target="_blank" rel="noopener sponsored" className="btn-gradient px-5 py-2.5 text-sm">
                En Ucuz Mağazaya Git <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <PriceAlertButton productId={product.id} currentPrice={best?.current_price ?? null} />
          </div>

          {product.description && <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{product.description}</p>}
        </div>
      </div>

      <div className="mt-10">
        <PriceHistoryChart history={history} stores={chartStores} />
      </div>

      {specs.length > 0 && (
        <section className="mt-8 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Teknik Özellikler</h2>
          <dl className="mt-4 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            {specs.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-slate-100 py-2 dark:border-slate-800">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-right font-medium text-slate-800 dark:text-slate-200">{String(v)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <SimilarCarousel items={similar} />
    </div>
  );
}
