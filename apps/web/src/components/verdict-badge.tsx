import type { AIPriceAnalysis } from '@price-compare/shared';
import { cn } from '@/lib/utils';

export const VERDICT_STYLES: Record<AIPriceAnalysis['verdict'], { label: string; short: string; cls: string }> = {
  BUY_NOW: { label: 'Şu An Alın!', short: 'Alınır ✓', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  WAIT: { label: 'Bekleyin', short: 'Bekle ⏳', cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  OVERPRICED: { label: 'Pahalı', short: 'Pahalı ⚠️', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  GOOD_DEAL: { label: 'Fırsat!', short: 'Alınır ✓', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
};

export function VerdictBadge({ verdict, long = false, className }: { verdict: AIPriceAnalysis['verdict']; long?: boolean; className?: string }) {
  const s = VERDICT_STYLES[verdict];
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', s.cls, className)}>
      {long ? s.label : s.short}
    </span>
  );
}
