'use client';

import { useSyncExternalStore } from 'react';

/**
 * Tiny localStorage-backed store shared by every hook instance in the tab
 * (and synced across tabs via the `storage` event), so the navbar badge,
 * product cards and floating bars always show the same state.
 */
export function createPersistedStore<T>(key: string, initial: T) {
  let state: T = initial;
  let loaded = false;
  const listeners = new Set<() => void>();

  const load = () => {
    if (loaded || typeof window === 'undefined') return;
    loaded = true;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) state = JSON.parse(raw) as T;
    } catch {
      /* corrupted value -> keep initial */
    }
    window.addEventListener('storage', (e) => {
      if (e.key !== key) return;
      try {
        state = e.newValue ? (JSON.parse(e.newValue) as T) : initial;
      } catch {
        state = initial;
      }
      listeners.forEach((l) => l());
    });
  };

  const set = (updater: (prev: T) => T) => {
    load();
    state = updater(state);
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* quota / private mode */
    }
    listeners.forEach((l) => l());
  };

  const subscribe = (l: () => void) => {
    load();
    listeners.add(l);
    return () => listeners.delete(l);
  };

  const useValue = (): T =>
    useSyncExternalStore(
      subscribe,
      () => {
        load();
        return state;
      },
      () => initial,
    );

  return { useValue, set };
}
