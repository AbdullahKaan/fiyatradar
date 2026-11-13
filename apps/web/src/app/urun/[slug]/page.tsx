import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink, ImageOff, ShieldCheck } from 'lucide-react';
import { getPriceHistory, getProductBySlug, getProductListings, PRODUCT_COLUMNS, type MasterProduct, type StoreListing } from '@price-compare/shared';
import { AIAnalysisCard } from '@/components/ai-analysis-card';
import { PriceChart } from '@/components/price-chart';
import { PriceAlertButton } from '@/components/price-alert-button';
import { ProductCard } from '@/components/product-card';
import { getPublicSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { bestListing, formatPrice, timeAgo } from '@/lib/utils';

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
    getPriceHistory(product.id, undefined, 180, supabase),
    supabase.from('master_products').select(`${PRODUCT_COLUMNS}, store_listings(*, store:stores(*))`).eq('category', product.category).neq('id', product.id).limit(4),
  ]);
  const similar = (similarRes.data ?? []).map((raw) => {
    const { store_listings, ...rest } = raw as Record<string, unknown> & { store_listings?: StoreListing[] };
    return { product: rest as unknown as MasterProduct, listings: (store_listings ?? []).map((l) => ({ ...l, current_price: Number(l.current_price) })) };
  });
  return { product, listings, history, similar };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await loadProduct(params.slug);
  if (!data) return { title: 'Ürün bulunamadı' };
  const best = bestListing(data.listings);
  const title = `${data.product.name} Fiyatları`;
  const description = `${data.product.name} en ucuz ${best ? formatPrice(best.current_price) : ''} — ${data.listings.length} mağazada fiyat karşılaştırması, fiyat geçmişi ve AI analizi.`;
  return { title, description, openGraph: { title, description, images: data.product.image_url ? [data.product.image_url] : [] } };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const data = await loadProduct(params.slug);
  if (!data) notFound();
  const { product, listings, history, similar } = data;
  const sorted = [...listings].sort((a, b) => Number(b.in_stock) - Number(a.in_stock) || a.current_price - b.current_price);
  const best = bestListing(listings);
  const storeNames = Object.fromEntries(listings.map((l) => [l.store_id, l.store?.name ?? 'Mağaza']));
  const specs = Object.entries(product.specs ?? {}).filter(([, v]) => v != null && typeof v !== 'object');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/" className="hover:text-primary">Ana Sayfa</Link> / <Link href={`/ara?category=${encodeURIComponent(product.category)}` as never} className="hover:text-primary">{product.category}</Link>
      </nav>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="card relative aspect-square overflow-hidden bg-white">
          {product.image_url ? (
            <Image src={product.image_url} alt={product.name} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain p-8" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-300"><ImageOff className="h-16 w-16" /></div>
          )}
        </div>
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">{product.brand} · {product.category}</p>
            <h1 className="mt-1 text-3xl font-extrabold">{product.name}</h1>
            {best && (
              <p className="mt-3 text-sm text-slate-500">
                En düşük fiyat: <span className="text-2xl font-extrabold text-primary">{formatPrice(best.current_price, best.currency)}</span> · {best.store?.name}
              </p>
            )}
          </div>
          <AIAnalysisCard analysis={product.ai_price_analysis} />
          <div className="flex flex-wrap gap-3">
            {best && <a href={best.affiliate_url || best.product_url} target="_blank" rel="noopener sponsored" className="btn-primary px-6 py-3">En Ucuz Mağazaya Git <ExternalLink className="h-4 w-4" /></a>}
            <PriceAlertButton productId={product.id} currentPrice={best?.current_price ?? null} />
          </div>
          {product.description && <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{product.description}</p>}
        </div>
      </div>

      <section className="card mt-8 overflow-hidden">
        <h2 className="border-b border-slate-200 px-5 py-4 font-bold dark:border-slate-800">Mağaza Karşılaştırması ({sorted.length})</h2>
        {sorted.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">Bu ürün için mağaza fiyatı bulunmuyor.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800/50">
                <tr><th className="px-5 py-3">Mağaza</th><th className="px-5 py-3">Fiyat</th><th className="px-5 py-3">Stok</th><th className="px-5 py-3">Güncelleme</th><th className="px-5 py-3" /></tr>
              </thead>
              <tbody>
                {sorted.map((l, i) => (
                  <tr key={l.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {l.store?.logo_url ? (
                          <Image src={l.store.logo_url} alt={l.store.name} width={32} height={32} className="h-8 w-8 rounded object-contain" />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">{l.store?.name?.slice(0, 2) ?? '?'}</span>
                        )}
                        <div>
                          <p className="font-semibold">{l.store?.name ?? 'Mağaza'}</p>
                          {l.store && <p className="flex items-center gap-1 text-xs text-slate-500"><ShieldCheck className="h-3 w-3" /> Güven: {l.store.reliability_score}/100</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={i === 0 && l.in_stock ? 'text-lg font-extrabold text-green-600' : 'font-bold'}>{formatPrice(l.current_price, l.currency)}</span>
                      {l.original_price && l.original_price > l.current_price && <span className="ml-2 text-xs text-slate-400 line-through">{formatPrice(l.original_price, l.currency)}</span>}
                      {l.discount_percent != null && l.discount_percent > 0 && <span className="ml-2 rounded bg-red-100 px-1.5 text-xs font-semibold text-red-600">-%{Math.round(l.discount_percent)}</span>}
                    </td>
                    <td className="px-5 py-3">{l.in_stock ? <span className="text-green-600">Stokta</span> : <span className="text-slate-400">Tükendi</span>}</td>
                    <td className="px-5 py-3 text-slate-500">{timeAgo(l.last_updated)}</td>
                    <td className="px-5 py-3 text-right">
                      <a href={l.affiliate_url || l.product_url} target="_blank" rel="noopener sponsored" className="btn-primary whitespace-nowrap">Mağazaya Git <ExternalLink className="h-3.5 w-3.5" /></a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-8"><PriceChart history={history} storeNames={storeNames} /></div>

      {specs.length > 0 && (
        <section className="card mt-8 p-5">
          <h2 className="font-bold">Teknik Özellikler</h2>
          <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            {specs.map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-slate-100 py-2 dark:border-slate-800"><dt className="text-slate-500">{k}</dt><dd className="font-medium">{String(v)}</dd></div>
            ))}
          </dl>
        </section>
      )}

      {similar.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold">Benzer Ürünler</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            {similar.map((s) => <ProductCard key={s.product.id} product={s.product} listings={s.listings} />)}
          </div>
        </section>
      )}
    </div>
  );
}
