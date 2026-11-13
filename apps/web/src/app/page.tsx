import { Bot, Cpu, Package, Search, ShieldCheck, Sparkles, Store } from 'lucide-react';
import { HomeDeals } from '@/components/home/HomeDeals';
import { fetchAllCatalog, realDiscount, type CatalogItem } from '@/lib/catalog';
import { getPublicSupabase, isSupabaseConfigured } from '@/lib/supabase';

export const revalidate = 3600;

const VERDICT_RANK: Record<string, number> = { BUY_NOW: 0, GOOD_DEAL: 1, OVERPRICED: 2, WAIT: 3 };

const STEPS = [
  { icon: Search, title: 'Toplar', text: 'Hepsiburada, Trendyol ve Amazon TR fiyatlarını 6 saatte bir otomatik çekeriz.' },
  { icon: Cpu, title: 'Eşleştirir', text: 'Farklı mağazalardaki aynı ürünü yapay zeka ile tek sayfada birleştiririz.' },
  { icon: ShieldCheck, title: 'Doğrular', text: 'Fiyat geçmişini analiz edip indirimden önce şişirilen sahte indirimleri yakalarız.' },
  { icon: Bot, title: 'Önerir', text: 'AI, "Şimdi al" mı "Bekle" mi söyler; sorularınızı asistan yanıtlar.' },
];

async function loadCatalog(): Promise<{ items: CatalogItem[]; storeCount: number }> {
  if (!isSupabaseConfigured()) return { items: [], storeCount: 0 };
  const supabase = getPublicSupabase();
  try {
    const [items, stores] = await Promise.all([
      fetchAllCatalog(supabase),
      supabase.from('stores').select('id', { count: 'exact', head: true }).eq('is_active', true),
    ]);
    // Real discounts first, then by AI verdict (best deals on top)
    items.sort(
      (a, b) =>
        realDiscount(b) - realDiscount(a) ||
        (VERDICT_RANK[a.product.ai_price_analysis?.verdict ?? ''] ?? 9) - (VERDICT_RANK[b.product.ai_price_analysis?.verdict ?? ''] ?? 9),
    );
    return { items, storeCount: stores.count ?? 0 };
  } catch (err) {
    console.error('[home] veri yüklenemedi', err);
    return { items: [], storeCount: 0 };
  }
}

export default async function HomePage() {
  const { items, storeCount } = await loadCatalog();
  const productLabel = `${Math.max(items.length, 20)}+`;
  const storeLabel = String(storeCount || 3);

  return (
    <>
      {/* SECTION 1: Hero */}
      <section className="relative w-full overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700">
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 animate-float rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-16 h-[28rem] w-[28rem] animate-float rounded-full bg-fuchsia-400/20 blur-3xl [animation-delay:-3s]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.12)_1px,transparent_0)] [background-size:28px_28px]" />

        <div className="relative mx-auto max-w-4xl px-4 pb-20 pt-16 text-center sm:pb-24 sm:pt-24">
          <span className="inline-flex animate-fadeIn items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur">
            🤖 Yapay Zeka Destekli
          </span>
          <h1 className="mt-6 animate-fade-up text-5xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
            En Ucuz Fiyatı
            <br />
            <span className="bg-gradient-to-r from-amber-200 via-pink-200 to-white bg-clip-text text-transparent">Biz Bulalım</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl animate-fade-up text-lg text-indigo-100 [animation-delay:100ms] sm:text-xl">
            Hepsiburada, Trendyol ve Amazon TR fiyatlarını anında karşılaştır
          </p>

          <form action="/ara" method="get" role="search" className="mx-auto mt-10 flex max-w-2xl animate-fade-up items-center gap-2 rounded-full bg-white p-2 shadow-2xl shadow-indigo-950/40 [animation-delay:200ms]">
            <Search className="ml-3 h-5 w-5 shrink-0 text-slate-400" aria-hidden />
            <input
              name="q"
              type="search"
              placeholder="Ürün ara... (iPhone, Samsung, PlayStation...)"
              aria-label="Ürün ara"
              className="min-w-0 flex-1 bg-transparent px-2 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400"
            />
            <button type="submit" className="shrink-0 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/40 transition hover:brightness-110 sm:px-8">
              Ara
            </button>
          </form>

          <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-white/90">
            <li className="flex items-center gap-2"><Package className="h-5 w-5 text-amber-200" /> {productLabel} Ürün</li>
            <li className="flex items-center gap-2"><Store className="h-5 w-5 text-amber-200" /> {storeLabel} Mağaza</li>
            <li className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-amber-200" /> AI Analizi</li>
          </ul>
        </div>
      </section>

      {/* SECTION 2 + 3: Category pills + deals grid */}
      <HomeDeals items={items} />

      {/* How it works */}
      <section id="nasil-calisir" className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-16">
        <h2 className="text-center text-3xl font-extrabold text-slate-900 dark:text-white">Nasıl Çalışır?</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30"><Icon className="h-6 w-6" /></div>
              <h3 className="mt-4 font-bold text-slate-900 dark:text-white">{i + 1}. {title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 4: Stats bar */}
      <section className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-700">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 text-center text-white sm:grid-cols-3">
          <div>
            <p className="text-4xl font-black">{productLabel}</p>
            <p className="mt-1 text-indigo-100">Ürün Karşılaştırıldı</p>
          </div>
          <div>
            <p className="text-4xl font-black">{storeLabel}</p>
            <p className="mt-1 text-indigo-100">Büyük Mağaza Takip Ediliyor</p>
          </div>
          <div>
            <p className="flex items-center justify-center gap-2 text-4xl font-black"><Bot className="h-9 w-9" /> AI</p>
            <p className="mt-1 text-indigo-100">ile Sahte İndirim Tespiti</p>
          </div>
        </div>
      </section>
    </>
  );
}
