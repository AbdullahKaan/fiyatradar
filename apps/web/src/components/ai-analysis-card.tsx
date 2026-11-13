import { AlertTriangle, Bot, TrendingDown, TrendingUp } from 'lucide-react';
import type { AIPriceAnalysis } from '@price-compare/shared';
import { formatPrice, timeAgo } from '@/lib/utils';
import { VerdictBadge } from './verdict-badge';

export function AIAnalysisCard({ analysis }: { analysis: AIPriceAnalysis | null }) {
  if (!analysis) {
    return (
      <div className="card flex items-center gap-3 p-5 text-sm text-slate-500">
        <Bot className="h-5 w-5 text-primary" /> Bu ürün için AI fiyat analizi henüz hazırlanmadı.
      </div>
    );
  }
  const diff = analysis.current_vs_avg_percent;
  return (
    <section className="card overflow-hidden" aria-label="AI Fiyat Analizi">
      {analysis.fake_discount_detected && (
        <div className="flex items-start gap-2 bg-red-600 px-5 py-3 text-sm font-medium text-white">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span><strong>Sahte İndirim Uyarısı:</strong> Fiyat, indirimden önce yapay olarak yükseltilmiş görünüyor.</span>
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold"><Bot className="h-5 w-5 text-primary" /> AI Fiyat Analizi</h2>
          <VerdictBadge verdict={analysis.verdict} long className="px-3 py-1 text-sm" />
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{analysis.summary}</p>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-green-50 p-3 dark:bg-green-900/20">
            <dt className="text-xs text-slate-500">6 Ay En Düşük</dt>
            <dd className="mt-1 font-bold text-green-700 dark:text-green-400">{formatPrice(analysis.lowest_6m)}</dd>
          </div>
          <div className="rounded-xl bg-red-50 p-3 dark:bg-red-900/20">
            <dt className="text-xs text-slate-500">6 Ay En Yüksek</dt>
            <dd className="mt-1 font-bold text-red-700 dark:text-red-400">{formatPrice(analysis.highest_6m)}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
            <dt className="text-xs text-slate-500">Ortalamaya Göre</dt>
            <dd className={`mt-1 flex items-center justify-center gap-1 font-bold ${diff <= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {diff <= 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
              %{Math.abs(diff).toFixed(1)}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-slate-400">Son analiz: {timeAgo(analysis.analyzed_at)}</p>
      </div>
    </section>
  );
}
