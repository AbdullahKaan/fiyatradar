'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ImageOff, ZoomIn } from 'lucide-react';

/** Product image with cursor-following zoom on hover (desktop). */
export function ProductGallery({ src, alt }: { src: string | null; alt: string }) {
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  const [error, setError] = useState(false);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
  };

  return (
    <div
      className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-2xl bg-slate-50 p-8 dark:bg-slate-800/60"
      onMouseEnter={() => setZoom(true)}
      onMouseLeave={() => setZoom(false)}
      onMouseMove={onMove}
    >
      {src && !error ? (
        <div className="relative h-full w-full">
          <Image
            src={src}
            alt={alt}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-contain transition-transform duration-200 ease-out"
            style={{ transform: zoom ? 'scale(1.8)' : 'scale(1)', transformOrigin: origin }}
            onError={() => setError(true)}
          />
        </div>
      ) : (
        <div className="flex h-full items-center justify-center text-slate-300"><ImageOff className="h-16 w-16" /></div>
      )}
      <span className="pointer-events-none absolute bottom-4 right-4 hidden items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 shadow transition group-hover:opacity-0 dark:bg-slate-900/90 dark:text-slate-300 lg:flex">
        <ZoomIn className="h-3.5 w-3.5" /> Yakınlaştırmak için üzerine gelin
      </span>
    </div>
  );
}
