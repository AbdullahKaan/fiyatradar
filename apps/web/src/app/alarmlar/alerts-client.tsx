'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BellOff, Loader2, LogIn, Trash2 } from 'lucide-react';
import type { PriceAlert } from '@price-compare/shared';
import { getBrowserSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { formatPrice, timeAgo } from '@/lib/utils';

export function AlertsClient() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'auth' | 'error'>('loading');
  const [email, setEmail] = useState('');
  const [info, setInfo] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    const res = await fetch('/api/alerts', { cache: 'no-store' }).catch(() => null);
    if (res?.status === 401) return setStatus('auth');
    if (!res?.ok) return setStatus('error');
    const json = (await res.json()) as { alerts: PriceAlert[] };
    setAlerts(json.alerts);
    setStatus('ready');
  }, []);

  useEffect(() => { void load(); }, [load]);

  const remove = async (id: string) => {
    const res = await fetch(`/api/alerts?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (res.ok) setAlerts((a) => a.filter((x) => x.id !== id));
  };

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured()) return setInfo('Supabase yapılandırılmamış.');
    const { error } = await getBrowserSupabase().auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/alarmlar` } });
    setInfo(error ? `Hata: ${error.message}` : 'Giriş bağlantısı e-posta adresinize gönderildi.');
  };

  if (status === 'loading') return <div className="mt-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (status === 'error') return <p className="card mt-6 p-6 text-sm text-red-600">Alarmlar yüklenemedi.</p>;
  if (status === 'auth') {
    return (
      <form onSubmit={login} className="card mt-6 space-y-3 p-6">
        <p className="flex items-center gap-2 font-semibold"><LogIn className="h-5 w-5 text-primary" /> Alarmlarınızı görmek için giriş yapın</p>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@eposta.com" className="input" aria-label="E-posta" />
        <button type="submit" className="btn-primary w-full">Giriş Bağlantısı Gönder</button>
        {info && <p className="text-sm text-slate-600">{info}</p>}
      </form>
    );
  }
  if (alerts.length === 0) {
    return (
      <div className="card mt-6 p-10 text-center text-slate-500">
        <BellOff className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3">Henüz fiyat alarmınız yok. Bir ürün sayfasından alarm kurabilirsiniz.</p>
      </div>
    );
  }
  return (
    <ul className="mt-6 space-y-3">
      {alerts.map((a) => (
        <li key={a.id} className="card flex items-center justify-between gap-4 p-4">
          <div>
            <Link href={`/urun/${a.master_product.slug}` as never} className="font-semibold hover:text-primary">{a.master_product.name}</Link>
            <p className="text-sm text-slate-500">
              Hedef: <span className="font-semibold text-primary">{formatPrice(a.target_price, a.currency)}</span> · {a.triggered_at ? `Tetiklendi ${timeAgo(a.triggered_at)}` : a.is_active ? 'Aktif' : 'Pasif'}
            </p>
          </div>
          <button onClick={() => remove(a.id)} className="btn-ghost text-red-600" aria-label="Alarmı sil"><Trash2 className="h-4 w-4" /></button>
        </li>
      ))}
    </ul>
  );
}
