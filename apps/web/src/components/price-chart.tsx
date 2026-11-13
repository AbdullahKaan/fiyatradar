'use client';

import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PriceHistory } from '@price-compare/shared';
import { cn, formatPrice } from '@/lib/utils';

interface PriceChartProps {
  history: PriceHistory[];
  storeName?: string;
  storeNames?: Record<string, string>;
}

const RANGES = [30, 90, 180] as const;
const COLORS = ['rgb(var(--primary))', '#f97316', '#10b981', '#ef4444', '#8b5cf6', '#0ea5e9'];

const dayKey = (iso: string) => iso.slice(0, 10);
const fmtDate = (key: string) => new Date(key).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });

export function PriceChart({ history, storeName, storeNames = {} }: PriceChartProps) {
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);

  const { data, stores } = useMemo(() => {
    const since = Date.now() - range * 86_400_000;
    const filtered = history.filter((h) => new Date(h.recorded_at).getTime() >= since);
    const storeIds = Array.from(new Set(filtered.map((h) => h.store_id)));
    // One row per day, one column per store (last recorded price that day).
    const byDay = new Map<string, Record<string, number | string>>();
    for (const h of filtered) {
      const key = dayKey(h.recorded_at);
      const row = byDay.get(key) ?? { date: key };
      row[h.store_id] = h.price;
      byDay.set(key, row);
    }
    const rows = Array.from(byDay.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return { data: rows, stores: storeIds };
  }, [history, range]);

  const label = (id: string) => storeNames[id] ?? (stores.length === 1 && storeName ? storeName : `Mağaza ${id.slice(0, 4)}`);

  return (
    <section className="card p-5" aria-label="Fiyat geçmişi">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold">Fiyat Geçmişi{storeName ? ` — ${storeName}` : ''}</h2>
        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="tablist">
          {RANGES.map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={range === r}
              onClick={() => setRange(r)}
              className={cn('rounded-lg px-3 py-1 text-xs font-semibold transition', range === r ? 'bg-white text-primary shadow dark:bg-slate-900' : 'text-slate-500')}
            >
              {r} gün
            </button>
          ))}
        </div>
      </div>
      {data.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-500">Bu dönem için fiyat geçmişi bulunmuyor.</p>
      ) : (
        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11 }} minTickGap={24} />
              <YAxis tickFormatter={(v: number) => `₺${Math.round(v).toLocaleString('tr-TR')}`} tick={{ fontSize: 11 }} width={80} domain={['auto', 'auto']} />
              <Tooltip
                labelFormatter={(l) => new Date(String(l)).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
                formatter={(value, name) => [formatPrice(Number(value)), label(String(name))]}
                contentStyle={{ borderRadius: 12, fontSize: 12 }}
              />
              {stores.length > 1 && <Legend formatter={(v) => label(String(v))} />}
              {stores.map((id, i) => (
                <Line key={id} type="monotone" dataKey={id} name={id} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
