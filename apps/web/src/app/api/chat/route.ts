import { NextResponse, type NextRequest } from 'next/server';
import { formatPrice, getPriceHistory, getProductListings, PRODUCT_COLUMNS, type MasterProduct } from '@price-compare/shared';
import { askProductAssistant } from '@/lib/gemini';
import { getPublicSupabase, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitize(term: string): string {
  return term.replace(/[%_\\,()]/g, ' ').replace(/\s+/g, ' ').trim();
}

async function productContext(productId: string): Promise<string> {
  const supabase = getPublicSupabase();
  const { data } = await supabase.from('master_products').select(PRODUCT_COLUMNS).eq('id', productId).maybeSingle();
  if (!data) return 'Ürün bulunamadı.';
  const product = data as unknown as MasterProduct;
  const [listings, history] = await Promise.all([
    getProductListings(productId, supabase),
    getPriceHistory(productId, undefined, 180, supabase),
  ]);
  const prices = history.map((h) => h.price);
  const lines = [
    `Ürün: ${product.name} (${product.brand}, ${product.category})`,
    'Mağaza fiyatları:',
    ...listings.map((l) => `- ${l.store?.name ?? 'Mağaza'}: ${formatPrice(l.current_price, l.currency)}${l.original_price ? ` (liste: ${formatPrice(l.original_price, l.currency)})` : ''} ${l.in_stock ? 'stokta' : 'stokta yok'}`),
  ];
  if (prices.length) {
    lines.push(`Son 6 ay: en düşük ${formatPrice(Math.min(...prices))}, en yüksek ${formatPrice(Math.max(...prices))}, ortalama ${formatPrice(prices.reduce((a, b) => a + b, 0) / prices.length)} (${prices.length} kayıt)`);
  }
  const a = product.ai_price_analysis;
  if (a) lines.push(`AI analizi: ${a.verdict_tr} — ${a.summary}${a.fake_discount_detected ? ' (Sahte indirim tespit edildi!)' : ''}`);
  return lines.join('\n');
}

async function catalogContext(question: string): Promise<string> {
  const supabase = getPublicSupabase();
  const words = sanitize(question).split(' ').filter((w) => w.length >= 3).slice(0, 5);
  let query = supabase
    .from('master_products')
    .select('name, brand, category, ai_price_analysis, store_listings(current_price, in_stock, store:stores(name))')
    .limit(10);
  if (words.length) query = query.or(words.map((w) => `name.ilike.%${w}%,brand.ilike.%${w}%`).join(','));
  const { data } = await query;
  if (!data?.length) return 'Eşleşen ürün verisi bulunamadı; genel alışveriş tavsiyesi ver.';
  return data
    .map((p) => {
      const row = p as unknown as { name: string; brand: string; category: string; ai_price_analysis: { verdict_tr?: string } | null; store_listings: { current_price: number; in_stock: boolean; store: { name: string } | null }[] };
      const listings = [...(row.store_listings ?? [])].sort((x, y) => Number(x.current_price) - Number(y.current_price));
      const best = listings[0];
      return `- ${row.name} (${row.brand}, ${row.category}): ${best ? `en ucuz ${formatPrice(Number(best.current_price))} @ ${best.store?.name ?? 'mağaza'}` : 'fiyat yok'}${row.ai_price_analysis?.verdict_tr ? `, AI: ${row.ai_price_analysis.verdict_tr}` : ''}`;
    })
    .join('\n');
}

export async function POST(req: NextRequest) {
  let body: { question?: unknown; product_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 });
  }
  const question = typeof body.question === 'string' ? body.question.trim().slice(0, 1000) : '';
  if (!question) return NextResponse.json({ error: 'Soru boş olamaz.' }, { status: 400 });
  const productId = typeof body.product_id === 'string' && UUID_RE.test(body.product_id) ? body.product_id : undefined;
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: 'AI asistanı yapılandırılmamış (GEMINI_API_KEY).' }, { status: 503 });

  try {
    const context = isSupabaseConfigured()
      ? productId ? await productContext(productId) : await catalogContext(question)
      : 'Ürün veritabanı bağlı değil.';
    const answer = await askProductAssistant(question, context);
    return NextResponse.json({ answer });
  } catch (err) {
    console.error('[chat]', err);
    return NextResponse.json({ error: 'AI yanıtı alınamadı, lütfen tekrar deneyin.' }, { status: 502 });
  }
}
