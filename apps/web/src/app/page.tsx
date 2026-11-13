import Link from 'next/link';
import { Bot, Cpu, Dumbbell, Gamepad2, Home, Laptop, Search, ShieldCheck, Shirt, Smartphone, Sparkles, Store, BookOpen, Tv, Zap } from 'lucide-react';
import { getTopDeals, type TopDeal } from '@price-compare/shared';
import { AnimatedHeroSearch } from '@/components/animated-hero-search';
import { ProductCard } from '@/components/product-card';
import { getPublicSupabase, isSupabaseConfigured } from '@/lib/supabase';

export const revalidate = 3600;

const CATEGORIES = [
  { name: 'Elektronik', icon: Tv },
  { name: 'Telefon', icon: Smartphone },
  { name: 'Bilgisayar', icon: Laptop },
  { name: 'Ev Aletleri', icon: Home },
  { name: 'Giyim', icon: Shirt },
  { name: 'Kozmetik', icon: Sparkles },
  { name: 'Spor', icon: Dumbbell },
  { name: 'Kitap', icon: BookOpen },
  { name: 'Oyun', icon: Gamepad2 },
];

const STEPS = [
  { icon: Search, title: 'Toplar', text: 'Hepsiburada, Trendyol ve Amazon TR fiyatlarını 6 saatte bir otomatik çekeriz.' },
  { icon: Cpu, title: 'Eşleştirir', text: 'Gemini embedding ile farklı mağazalardaki aynı ürünü tek sayfada birleştiririz.' },
  { icon: ShieldCheck, title: 'Doğrular', text: 'Fiyat geçmişini analiz edip indirimden önce şişirilen sahte indirimleri yakalarız.' },
  { icon: Bot, title: 'Önerir', text: 'AI, "Şimdi al" mı "Bekle" mi söyler; sorularınızı asistan yanıtlar.' },
];

async function loadData(): Promise<{ deals: TopDeal[]; productCount: number; storeCount: number }> {
  if (!isSupabaseConfigured()) return { deals: [], productCount: 0, storeCount: 0 };
  const supabase = getPublicSupabase();
  try {
    const [deals, products, stores] = await Promise.all([
      getTopDeals(8, supabase),
      supabase.from('master_products').select('id', { count: 'exact', head: true }),
      supabase.from('stores').select('id', { count: 'exact', head: true }).eq('is_active', true),
    ]);
    return { deals, productCount: products.count ?? 0, storeCount: stores.count ?? 0 };
  } catch (err) {
    console.error('[home] veri yüklenemedi', err);
    return { deals: [], productCount: 0, storeCount: 0 };
  }
}

export default async function HomePage() {
  const { deals, productCount, storeCount } = await loadData();

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/10 to-transparent">
        <div className="mx-auto max-w-4xl px-4 pb-16 pt-20 text-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Zap className="h-3.5 w-3.5" /> Yapay zeka destekli
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
            En iyi fiyatı bul, <span className="text-primary">sahte indirime</span> kanma.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            Türkiye&apos;nin büyük mağazalarındaki fiyatları tek aramada karşılaştırın.
          </p>
          <div className="mx-auto mt-8 max-w-3xl"><AnimatedHeroSearch /></div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto grid max-w-5xl grid-cols-3 divide-x divide-slate-200 px-4 py-6 text-center dark:divide-slate-800">
          <div><p className="text-2xl font-extrabold text-primary">{productCount.toLocaleString('tr-TR')}</p><p className="text-xs text-slate-500 sm:text-sm">ürün karşılaştırıldı</p></div>
          <div><p className="text-2xl font-extrabold text-primary">{storeCount}</p><p className="text-xs text-slate-500 sm:text-sm">mağaza</p></div>
          <div><p className="flex items-center justify-center gap-1 text-2xl font-extrabold text-primary"><Bot className="h-6 w-6" /> AI</p><p className="text-xs text-slate-500 sm:text-sm">destekli analiz</p></div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold">Günün Gerçek İndirimleri <span className="text-primary">(AI Onaylı)</span></h2>
          <Link href="/ara" className="text-sm font-semibold text-primary hover:underline">Tümünü gör →</Link>
        </div>
        {deals.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {deals.map((d) => <ProductCard key={d.product.id} product={d.product} listings={[d.listing]} />)}
          </div>
        ) : (
          <div className="card mt-6 p-10 text-center text-slate-500">
            <Store className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3">Şu anda AI onaylı fırsat bulunmuyor. Fiyatlar 6 saatte bir güncellenir.</p>
          </div>
        )}
      </section>

      <section id="kategoriler" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-6">
        <h2 className="text-2xl font-bold">Popüler Kategoriler</h2>
        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
          {CATEGORIES.map(({ name, icon: Icon }) => (
            <Link key={name} href={`/ara?category=${encodeURIComponent(name)}` as never} className="card flex flex-col items-center gap-2 p-4 text-center text-sm font-medium transition hover:-translate-y-1 hover:border-primary hover:text-primary">
              <Icon className="h-7 w-7 text-primary" />
              {name}
            </Link>
          ))}
        </div>
      </section>

      <section id="nasil-calisir" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-14">
        <h2 className="text-center text-2xl font-bold">Nasıl Çalışır?</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="card p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-6 w-6" /></div>
              <h3 className="mt-4 font-bold">{i + 1}. {title}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
