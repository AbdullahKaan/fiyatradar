import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatPrice as sharedFormatPrice, timeAgo as sharedTimeAgo, type StoreListing } from '@price-compare/shared';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Turkish price format: 31.499 ₺ (no decimals for whole numbers, 2 otherwise). */
export function formatPrice(price: number | null | undefined, currency = 'TRY'): string {
  if (price == null || !Number.isFinite(price)) return '-';
  if ((currency || 'TRY').toUpperCase() !== 'TRY') return sharedFormatPrice(price, currency);
  const whole = Math.abs(price - Math.round(price)) < 0.005;
  const digits = whole ? 0 : 2;
  return `${price.toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits })} ₺`;
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

/** Brand colors per store (matched by slug or name). */
export function storeTheme(nameOrSlug: string | undefined): { dot: string; text: string; bg: string; hex: string } {
  const key = (nameOrSlug ?? '').toLowerCase();
  if (key.includes('hepsi')) return { dot: 'bg-orange-500', text: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-500/10', hex: '#f97316' };
  if (key.includes('trendyol')) return { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50 dark:bg-red-500/10', hex: '#ef4444' };
  if (key.includes('amazon')) return { dot: 'bg-yellow-400', text: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-500/10', hex: '#eab308' };
  return { dot: 'bg-indigo-500', text: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-500/10', hex: '#6366f1' };
}
