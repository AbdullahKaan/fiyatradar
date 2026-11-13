'use client';

import { createPersistedStore } from './persisted-store';

const store = createPersistedStore<string[]>('fiyatradar-favorites', []);

/** localStorage based favorites (slugs), shared across all components. */
export function useFavorites() {
  const favorites = store.useValue();

  const toggle = (slug: string) =>
    store.set((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  const remove = (slug: string) => store.set((prev) => prev.filter((s) => s !== slug));
  const isFavorite = (slug: string) => favorites.includes(slug);

  return { favorites, toggle, remove, isFavorite, count: favorites.length };
}
