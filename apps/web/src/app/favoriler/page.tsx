'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Trash2 } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { ProductCard, ProductCardSkeletonGrid, toCardProps } from '@/components/ui/ProductCard';
import { fetchCatalogBySlugs, type CatalogItem } from '@/lib/catalog';
import { getBrowserSupabase, isSupabaseConfigured } from '@/lib/supabase';

export default function FavoritesPage() {
  const { favorites, remove } = useFavorites();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const key = favorites.join(',');

  useEffect(() => {
    let cancelled = false;
    const slugs = key ? key.split(',') : [];
    if (slugs.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    if (!isSupabaseConfigured()) {
      setError('Veritabanı bağlantısı yapılandırılmamış.');
      setLoading(false);
      return;
    }
    // Only show the skeleton on first load; removals update instantly below.
    setItems((prev) => {
      if (prev.length === 0) setLoading(true);
      return prev;
    });
    fetchCatalogBySlugs(getBrowserSupabase(), slugs)
      .then((data) => !cancelled && (setItems(data), setError(null)))
      .catch((e: Error) => !cancelled && setError(`Favoriler yüklenemedi: ${e.message}`))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [key]);

  const visible = items.filter((i) => favorites.includes(i.product.slug));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-extrabold text-slate-900 dark:text-white">
            <Heart className="h-7 w-7 fill-rose-500 text-rose-500" /> Favorilerim
          </h1>
          <p className="mt-1 text-sm text-slate-500">Favorileriniz bu tarayıcıda saklanır.</p>
        </div>
        {visible.length > 0 && (
          <button onClick={() => favorites.forEach(remove)} className="btn-ghost border border-slate-200 text-slate-600 dark:border-slate-700">
            <Trash2 className="h-4 w-4" /> Tümünü Kaldır
          </button>
        )}
      </div>

      {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</div>}

      {loading ? (
        <div className="mt-8"><ProductCardSkeletonGrid count={Math.min(Math.max(favorites.length, 1), 8)} /></div>
      ) : visible.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-20 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-rose-50 to-pink-100 dark:from-rose-500/10 dark:to-pink-500/10">
            <Heart className="h-14 w-14 animate-float text-rose-400" />
          </div>
          <h2 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">Henüz favori eklemediniz</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">Beğendiğiniz ürünlerdeki kalp simgesine dokunarak takip listenizi oluşturun.</p>
          <Link href="/" className="btn-gradient mt-6 px-6 py-3">Ürünleri Keşfet</Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((item) => <ProductCard key={item.product.id} {...toCardProps(item)} onRemove={() => remove(item.product.slug)} />)}
        </div>
      )}
    </div>
  );
}
