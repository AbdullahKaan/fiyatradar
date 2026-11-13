'use client';

import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';
import type { PriceHistory } from '@price-compare/shared';
import { formatPrice, storeTheme } from '@/lib/utils';

interface StoreInfo {
  id: string;
  name: string;
}

const DAYS = 30;
const fmtShort = (key: string) => new Date(key).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
const fmtLong = (key: string) => new Date(key).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });

function ChartTooltip({ active, payload, label, names }: TooltipProps<number, string> & { names: Record<string, string> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <p className="mb-1 font-semibold text-slate-900 dark:text-white">Tarih: {fmtLong(String(label))}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {names[String(p.dataKey)] ?? 'Mağaza'} — Fiyat: <span className="font-semibold">{formatPrice(Number(p.value))}</span>
        </p>
      ))}
    </div>
  );
}

export function PriceHistoryChart({ history, stores }: { history: PriceHistory[]; stores: StoreInfo[] }) {
  const names = useMemo(() => Object.fromEntries(stores.map((s) => [s.id, s.name])), [stores]);

  const { data, ids } = useMemo(() => {
    const since = Date.now() - DAYS * 86_400_000;
    const recent = history.filter((h) => new Date(h.recorded_at).getTime() >= since);
    const byDay = new Map<string, Record<string, number | string>>();
    for (const h of [...recent].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))) {
      const key = h.recorded_at.slice(0, 10);
      const row = byDay.get(key) ?? { date: key };
      row[h.store_id] = Number(h.price);
      byDay.set(key, row);
    }
    const rows = Array.from(byDay.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return { data: rows, ids: Array.from(new Set(recent.map((h) => h.store_id))) };
  }, [history]);

  const color = (id: string) => storeTheme(names[id]).hex;

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6" aria-label="Fiyat geçmişi">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">30 Günlük Fiyat Geçmişi</h2>
          <p className="text-sm text-slate-500">Mağaza bazında günlük fiyat değişimi</p>
        </div>
      </div>
      {data.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-500">Son 30 gün için fiyat geçmişi bulunmuyor.</p>
      ) : (
        <div className="mt-6 h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                {ids.map((id) => (
                  <linearGradient key={id} id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color(id)} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={color(id)} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} />
              <XAxis dataKey="date" tickFormatter={fmtShort} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} minTickGap={24} />
              <YAxis
                tickFormatter={(v: number) => `${Math.round(v).toLocaleString('tr-TR')}₺`}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={84}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<ChartTooltip names={names} />} />
              <Legend formatter={(v) => <span className="text-xs text-slate-600 dark:text-slate-300">{names[String(v)] ?? 'Mağaza'}</span>} />
              {ids.map((id) => (
                <Area
                  key={id}
                  type="monotone"
                  dataKey={id}
                  name={id}
                  stroke={color(id)}
                  strokeWidth={2.5}
                  fill={`url(#grad-${id})`}
                  dot={false}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
