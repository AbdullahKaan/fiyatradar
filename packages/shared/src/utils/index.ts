import type { AIPriceAnalysis } from '../types';

const CURRENCY_LOCALES: Record<string, string> = {
  TRY: 'tr-TR',
  USD: 'en-US',
  EUR: 'de-DE',
};

/**
 * Formats a price for display.
 * TRY -> "1.299,00 ₺", USD -> "$999.99", EUR -> "999,99 €"
 */
export function formatPrice(price: number, currency: string = 'TRY'): string {
  const code = (currency || 'TRY').toUpperCase();
  if (!Number.isFinite(price)) return '-';

  if (code === 'TRY') {
    const formatted = new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
    return `${formatted} ₺`;
  }

  try {
    return new Intl.NumberFormat(CURRENCY_LOCALES[code] ?? 'en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${price.toFixed(2)} ${code}`;
  }
}

/** Returns discount percentage (rounded, 0-100). Returns 0 for invalid input or price increases. */
export function calculateDiscount(original: number, current: number): number {
  if (!Number.isFinite(original) || !Number.isFinite(current) || original <= 0) return 0;
  if (current >= original) return 0;
  return Math.round(((original - current) / original) * 100);
}

const TR_CHAR_MAP: Record<string, string> = {
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  I: 'i',
  İ: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u',
};

/** Creates a URL-safe slug, transliterating Turkish characters. */
export function generateSlug(name: string): string {
  return name
    .replace(/[çÇğĞıIİöÖşŞüÜ]/g, (ch) => TR_CHAR_MAP[ch] ?? ch)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' ve ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 120);
}

/**
 * Builds an affiliate URL from a template.
 * Template can be a query fragment ("?aff={AFFILIATE_TAG}" or "aff={AFFILIATE_TAG}&src=x")
 * or a full redirect URL containing {URL} / {ENCODED_URL} (e.g. "https://aff.net/r?id={AFFILIATE_TAG}&u={ENCODED_URL}").
 */
export function buildAffiliateUrl(productUrl: string, template: string, tag: string): string {
  if (!template || !tag) return productUrl;

  const filled = template
    .replace(/\{AFFILIATE_TAG\}/g, encodeURIComponent(tag))
    .replace(/\{ENCODED_URL\}/g, encodeURIComponent(productUrl))
    .replace(/\{URL\}/g, productUrl);

  // Full redirect URL template
  if (/^https?:\/\//i.test(filled)) return filled;

  const params = filled.replace(/^[?&]+/, '');
  if (!params) return productUrl;

  try {
    const url = new URL(productUrl);
    const extra = new URLSearchParams(params);
    extra.forEach((value, key) => url.searchParams.set(key, value));
    return url.toString();
  } catch {
    const separator = productUrl.includes('?') ? '&' : '?';
    return `${productUrl}${separator}${params}`;
  }
}

/** Returns a Turkish relative time string such as "3 saat önce", "2 gün önce". */
export function timeAgo(date: string): string {
  const then = new Date(date).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.floor((Date.now() - then) / 1000);

  if (seconds < 0) return 'az önce';
  if (seconds < 60) return 'az önce';

  const units: [number, string][] = [
    [60 * 60 * 24 * 365, 'yıl'],
    [60 * 60 * 24 * 30, 'ay'],
    [60 * 60 * 24 * 7, 'hafta'],
    [60 * 60 * 24, 'gün'],
    [60 * 60, 'saat'],
    [60, 'dakika'],
  ];

  for (const [unitSeconds, label] of units) {
    const value = Math.floor(seconds / unitSeconds);
    if (value >= 1) return `${value} ${label} önce`;
  }
  return 'az önce';
}

/** Returns Tailwind text/background classes based on the AI price verdict. */
export function getPriceColor(analysis: AIPriceAnalysis | null | undefined): string {
  if (!analysis) return 'text-gray-700 bg-gray-100';
  if (analysis.fake_discount_detected) return 'text-red-700 bg-red-100';
  switch (analysis.verdict) {
    case 'BUY_NOW':
      return 'text-emerald-700 bg-emerald-100';
    case 'GOOD_DEAL':
      return 'text-green-700 bg-green-100';
    case 'WAIT':
      return 'text-amber-700 bg-amber-100';
    case 'OVERPRICED':
      return 'text-red-700 bg-red-100';
    default:
      return 'text-gray-700 bg-gray-100';
  }
}

/** Turkish label for a verdict, used as fallback when verdict_tr is empty. */
export function getVerdictLabel(verdict: AIPriceAnalysis['verdict']): string {
  const labels: Record<AIPriceAnalysis['verdict'], string> = {
    BUY_NOW: 'Hemen Al',
    GOOD_DEAL: 'İyi Fırsat',
    WAIT: 'Bekle',
    OVERPRICED: 'Pahalı',
  };
  return labels[verdict];
}
