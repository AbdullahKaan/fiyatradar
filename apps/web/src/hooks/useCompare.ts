'use client';

import { createPersistedStore } from './persisted-store';

export const MAX_COMPARE = 3;

export interface CompareItem {
  slug: string;
  name: string;
  image_url: string | null;
}

const store = createPersistedStore<CompareItem[]>('fiyatradar-compare', []);

/** Compare up to 3 products (persisted so the list survives navigation to /karsilastir). */
export function useCompare() {
  const items = store.useValue();
  const compareList = items.map((i) => i.slug);

  const toggle = (item: CompareItem | string) => {
    const next: CompareItem = typeof item === 'string' ? { slug: item, name: item, image_url: null } : item;
    store.set((prev) =>
      prev.some((p) => p.slug === next.slug)
        ? prev.filter((p) => p.slug !== next.slug)
        : prev.length < MAX_COMPARE
          ? [...prev, next]
          : prev,
    );
  };

  return {
    items,
    compareList,
    toggle,
    isComparing: (slug: string) => compareList.includes(slug),
    isFull: items.length >= MAX_COMPARE,
    count: items.length,
    clear: () => store.set(() => []),
  };
}
