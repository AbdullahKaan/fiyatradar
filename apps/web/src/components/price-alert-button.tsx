'use client';

import { useState } from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';

export function PriceAlertButton({ productId, currentPrice }: { productId: string; currentPrice: number | null }) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(currentPrice ? String(Math.floor(currentPrice * 0.9)) : '');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('loading');
    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, target_price: Number(target) }),
    }).catch(() => null);
    if (res?.ok) {
      setState('done');
      setMsg('Alarm kuruldu! Fiyat düştüğünde haber vereceğiz.');
    } else {
      const json = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
      setState('error');
      setMsg(res?.status === 401 ? 'Alarm kurmak için giriş yapmalısınız.' : json?.error ?? 'Alarm kurulamadı.');
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost border border-slate-300 dark:border-slate-700">
        <Bell className="h-4 w-4" /> Fiyat Alarmı Kur
      </button>
    );
  }
  return (
    <form onSubmit={submit} className="card space-y-2 p-4">
      <label className="block text-sm font-medium" htmlFor="target">Hedef fiyat (₺)</label>
      <div className="flex gap-2">
        <input id="target" type="number" min={1} step="0.01" required value={target} onChange={(e) => setTarget(e.target.value)} className="input" />
        <button type="submit" className="btn-primary" disabled={state === 'loading' || state === 'done'}>
          {state === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : state === 'done' ? <Check className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          Kur
        </button>
      </div>
      {msg && <p className={state === 'done' ? 'text-sm text-green-600' : 'text-sm text-red-600'}>{msg}</p>}
    </form>
  );
}
