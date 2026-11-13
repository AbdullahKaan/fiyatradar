import type { AIPriceAnalysis } from '@price-compare/shared';
import { VERDICTS } from '@/lib/catalog';
import { cn } from '@/lib/utils';

export function AIVerdictBadge({ verdict, className }: { verdict: AIPriceAnalysis['verdict'] | null | undefined; className?: string }) {
  const v = VERDICTS.find((x) => x.value === verdict);
  if (!v) return null;
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold', v.cls, className)}>
      <span aria-hidden>{v.emoji}</span> {v.label}
    </span>
  );
}
