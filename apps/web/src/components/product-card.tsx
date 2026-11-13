'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ImageOff, Store as StoreIcon } from 'lucide-react';
import type { MasterProduct, StoreListing } from '@price-compare/shared';
import { formatPrice, bestListing } from '@/lib/utils';
import { VerdictBadge } from './verdict-badge';

interface ProductCardProps {
  product: MasterProduct;
  listings: StoreListing[];
}

export function ProductCard({ product, listings }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const best = bestListing(listings);
  const discount = best?.discount_percent ?? null;
  const verdict = product.ai_price_analysis?.verdict;
  const storeCount = new Set(listings.map((l) => l.store_id)).size;

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-xl"
    >
      <Link href={`/urun/${product.slug}` as never} className="relative block aspect-square bg-slate-100 dark:bg-slate-800">
        {product.image_url && !imgError ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400"><ImageOff className="h-10 w-10" /></div>
        )}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {discount != null && discount > 10 && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">%{Math.round(discount)} İndirim</span>
          )}
          {product.ai_price_analysis?.fake_discount_detected && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">Şüpheli İndirim</span>
          )}
        </div>
        {verdict && <VerdictBadge verdict={verdict} className="absolute right-2 top-2" />}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{product.brand}</p>
        <h3 className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm font-semibold">{product.name}</h3>
        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            {best ? (
              <>
                <span className="inline-block rounded-lg bg-primary/10 px-2 py-1 text-lg font-extrabold text-primary">
                  {formatPrice(best.current_price, best.currency)}
                </span>
                {best.original_price && best.original_price > best.current_price && (
                  <span className="ml-2 text-xs text-slate-400 line-through">{formatPrice(best.original_price, best.currency)}</span>
                )}
              </>
            ) : (
              <span className="text-sm text-slate-500">Fiyat bilgisi yok</span>
            )}
          </div>
          {storeCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-slate-500"><StoreIcon className="h-3.5 w-3.5" />{storeCount} mağaza</span>
          )}
        </div>
        <Link href={`/urun/${product.slug}` as never} className="btn-primary mt-4 w-full">Fiyatları Karşılaştır</Link>
      </div>
    </motion.article>
  );
}
