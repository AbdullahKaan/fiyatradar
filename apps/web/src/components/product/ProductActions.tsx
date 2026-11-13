'use client';

import { useState } from 'react';
import { GitCompare, Heart, Share2 } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { useCompare } from '@/hooks/useCompare';
import { cn } from '@/lib/utils';

interface Props {
  slug: string;
  name: string;
  imageUrl: string | null;
}

export function ProductActions({ slug, name, imageUrl }: Props) {
  const { toggle: toggleFav, isFavorite } = useFavorites();
  const { toggle: toggleCompare, isComparing, isFull } = useCompare();
  const [toast, setToast] = useState('');
  const fav = isFavorite(slug);
  const comparing = isComparing(slug);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2500);
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: name, text: `${name} - FiyatRadar'da en uygun fiyat`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      flash('Bağlantı panoya kopyalandı');
    } catch {
      /* user cancelled share */
    }
  };

  const onCompare = () => {
    if (!comparing && isFull) return flash('En fazla 3 ürün karşılaştırabilirsiniz');
    toggleCompare({ slug, name, image_url: imageUrl });
    flash(comparing ? 'Karşılaştırmadan çıkarıldı' : 'Karşılaştırmaya eklendi');
  };

  const base = 'inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition sm:flex-none';

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { toggleFav(slug); flash(fav ? 'Favorilerden çıkarıldı' : 'Favorilere eklendi'); }}
          aria-pressed={fav}
          className={cn(base, fav ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300' : 'border-slate-200 bg-white text-slate-700 hover:border-rose-200 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200')}
        >
          <Heart className={cn('h-4 w-4', fav && 'fill-current')} /> {fav ? 'Favorilerde' : 'Favorilere Ekle'}
        </button>
        <button
          onClick={onCompare}
          aria-pressed={comparing}
          className={cn(base, comparing ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200')}
        >
          <GitCompare className="h-4 w-4" /> {comparing ? 'Karşılaştırmada' : 'Karşılaştır'}
        </button>
        <button onClick={share} className={cn(base, 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200')}>
          <Share2 className="h-4 w-4" /> Paylaş
        </button>
      </div>
      {toast && (
        <p role="status" className="absolute left-0 top-full mt-2 animate-fadeIn rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-white dark:text-slate-900">
          {toast}
        </p>
      )}
    </div>
  );
}
