import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  formatPrice as sharedFormatPrice,
  timeAgo as sharedTimeAgo,
  type StoreListing,
} from '@price-compare/shared';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number | null | undefined, currency = 'TRY'): string {
  if (price == null || !Number.isFinite(price)) return '-';
  return sharedFormatPrice(price, currency);
}

export function timeAgo(date: string | null | undefined): string {
  if (!date) return '-';
  return sharedTimeAgo(date);
}

/** Cheapest in-stock listing (falls back to cheapest overall). */
export function bestListing(listings: StoreListing[]): StoreListing | null {
  if (listings.length === 0) return null;
  const sorted = [...listings].sort((a, b) => a.current_price - b.current_price);
  return sorted.find((l) => l.in_stock) ?? sorted[0] ?? null;
}

export const CATEGORY_OPTIONS = [
  'Elektronik',
  'Telefon',
  'Bilgisayar',
  'Ev Aletleri',
  'Giyim',
  'Kozmetik',
  'Spor',
  'Kitap',
  'Oyun',
] as const;
