'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Bell, BellRing, CheckCircle2, ImageOff, Loader2, Mail, Search, Target, Trash2, X } from 'lucide-react';
import type { PriceAlert } from '@price-compare/shared';
import { fetchAllCatalog, type CatalogItem } from '@/lib/catalog';
import { getBrowserSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { bestListing, cn, formatPrice, timeAgo } from '@/lib/utils';

const PENDING_KEY = 'fiyatradar-pending-alert';
type Pending = { product_id: string; target_price: number };
type Msg = { type: 'success' | 'error' | 'info'; text: string } | null;

async function postAlert(body: Pending): Promise<Response | null> {
  return fetch('/api/alerts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
}

export function AlertsClient() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [target, setTarget] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const loadAlerts = useCallback(async () => {
    const res = await fetch('/api/alerts', { cache: 'no-store' }).catch(() => null);
    if (res?.status === 401) {
      setAuthed(false);
      setAlerts([]);
      return false;
    }
    if (res?.ok) {
      const json = (await res.json()) as { alerts: PriceAlert[] };
      setAlerts(json.alerts ?? []);
      setAuthed(true);
      return true;
    }
    setAuthed(false);
    return false;
  }, []);

  useEffect(() => {
    void (async () => {
      if (isSupabaseConfigured()) {
        const supabase = getBrowserSupabase();
        fetchAllCatalog(supabase).then(setCatalog).catch(() => setCatalog([]));
        const { data } = await supabase.auth.getUser();
        if (data.user?.email) setEmail(data.user.email);
      }
      const ok = await loadAlerts();
      // Finish an alarm that was started before the magic-link login.
      const raw = localStorage.getItem(PENDING_KEY);
      if (ok && raw) {
        localStorage.removeItem(PENDING_KEY);
        const res = await postAlert(JSON.parse(raw) as Pending);
        if (res?.ok) {
          setMsg({ type: 'success', text: 'Giriş yapıldı ve bekleyen alarmınız kuruldu!' });
          await loadAlerts();
        }
      }
      setLoading(false);
    })();
  }, [loadAlerts]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const priceOf = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of catalog) {
      const best = bestListing(item.listings);
      if (best) map.set(item.product.id, best.current_price);
    }
    return map;
  }, [catalog]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    const list = q ? catalog.filter((c) => `${c.product.name} ${c.product.brand ?? ''} ${c.product.category}`.toLocaleLowerCase('tr-TR').includes(q)) : catalog;
    return list.slice(0, 8);
  }, [catalog, query]);

  const choose = (item: CatalogItem) => {
    setSelected(item);
    setQuery(item.product.name);
    setOpen(false);
    const current = priceOf.get(item.product.id);
    if (current) setTarget(String(Math.floor(current * 0.9)));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!selected) return setMsg({ type: 'error', text: 'Lütfen listeden bir ürün seçin.' });
    const targetPrice = Number(target);
    if (!Number.isFinite(targetPrice) || targetPrice <= 0) return setMsg({ type: 'error', text: 'Geçerli bir hedef fiyat girin.' });

    setSubmitting(true);
    const body: Pending = { product_id: selected.product.id, target_price: targetPrice };
    const res = await postAlert(body);
    if (res?.ok) {
      setMsg({ type: 'success', text: `${selected.product.name} için ${formatPrice(targetPrice)} alarmı kuruldu!` });
      setSelected(null);
      setQuery('');
      setTarget('');
      await loadAlerts();
    } else if (res?.status === 401) {
      if (!email) {
        setMsg({ type: 'error', text: 'Alarm bildirimi için e-posta adresinizi girin.' });
      } else if (!isSupabaseConfigured()) {
        setMsg({ type: 'error', text: 'Sunucu yapılandırması eksik, lütfen daha sonra tekrar deneyin.' });
      } else {
        localStorage.setItem(PENDING_KEY, JSON.stringify(body));
        const { error } = await getBrowserSupabase().auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/alarmlar` } });
        setMsg(
          error
            ? { type: 'error', text: `E-posta gönderilemedi: ${error.message}` }
            : { type: 'info', text: `${email} adresine doğrulama bağlantısı gönderdik. Bağlantıya tıkladığınızda alarmınız otomatik olarak kurulacak.` },
        );
      }
    } else {
      const json = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
      setMsg({ type: 'error', text: json?.error ?? 'Alarm kurulamadı, lütfen tekrar deneyin.' });
    }
    setSubmitting(false);
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/alerts?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => null);
    if (res?.ok) setAlerts((a) => a.filter((x) => x.id !== id));
  };

  const selectedPrice = selected ? priceOf.get(selected.product.id) : undefined;

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-5">
      {/* Form */}
      <form onSubmit={submit} className="h-fit space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6 lg:col-span-2">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-white"><BellRing className="h-4 w-4" /></span>
          Yeni Alarm
        </h2>

        <div ref={boxRef} className="relative">
          <label htmlFor="alert-product" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Ürün</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="alert-product"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(null); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder="Ürün adı yazın…"
              autoComplete="off"
              className="input pl-9 pr-9"
            />
            {query && (
              <button type="button" onClick={() => { setQuery(''); setSelected(null); }} aria-label="Temizle" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {open && !selected && (
            <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              {suggestions.length === 0 ? (
                <li className="px-3 py-3 text-sm text-slate-500">{catalog.length === 0 ? 'Ürünler yükleniyor…' : 'Eşleşen ürün bulunamadı'}</li>
              ) : (
                suggestions.map((item) => (
                  <li key={item.product.id}>
                    <button type="button" onClick={() => choose(item)} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                      <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-800">
                        {item.product.image_url && <Image src={item.product.image_url} alt="" fill sizes="36px" className="object-contain p-1" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-slate-800 dark:text-slate-200">{item.product.name}</span>
                      <span className="shrink-0 text-xs font-semibold text-indigo-600 dark:text-indigo-400">{formatPrice(priceOf.get(item.product.id))}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
          {selectedPrice != null && <p className="mt-1.5 text-xs text-slate-500">Şu anki en düşük fiyat: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatPrice(selectedPrice)}</span></p>}
        </div>

        <div>
          <label htmlFor="alert-target" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Hedef fiyat (₺)</label>
          <div className="relative">
            <Target className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input id="alert-target" type="number" min={1} step="1" inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Örn. 30000" className="input pl-9" required />
          </div>
        </div>

        <div>
          <label htmlFor="alert-email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">E-posta</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input id="alert-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@eposta.com" className="input pl-9" required={authed === false} disabled={authed === true} />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">{authed ? 'Bildirimler bu adrese gönderilecek.' : 'İlk alarmda e-postanıza bir doğrulama bağlantısı göndeririz.'}</p>
        </div>

        <button type="submit" disabled={submitting} className="btn-gradient w-full py-3 text-sm disabled:opacity-60">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />} Alarm Kur
        </button>

        {msg && (
          <p
            role="status"
            className={cn(
              'animate-fadeIn rounded-xl px-3 py-2 text-sm',
              msg.type === 'success' && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
              msg.type === 'error' && 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
              msg.type === 'info' && 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300',
            )}
          >
            {msg.text}
          </p>
        )}
      </form>

      {/* Alarm list */}
      <div className="lg:col-span-3">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Aktif Alarmlarım</h2>
          {alerts.length > 0 && <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">{alerts.length} alarm</span>}
        </div>

        {loading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
            <div className="relative">
              <span className="absolute inset-0 animate-ping rounded-full bg-indigo-400/20" />
              <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-brand-gradient-soft">
                <Bell className="h-10 w-10 origin-top animate-ring text-indigo-600 dark:text-indigo-400" />
              </span>
            </div>
            <h3 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">Fiyat alarmı kurun</h3>
            <p className="mt-2 max-w-sm text-sm text-slate-500">
              {authed === false
                ? 'Takip etmek istediğiniz ürünü seçin, hedef fiyatınızı ve e-postanızı girin. Fiyat düştüğünde size haber verelim.'
                : 'Henüz aktif alarmınız yok. Soldaki formdan ilk alarmınızı oluşturun.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {alerts.map((a) => {
              const current = priceOf.get(a.master_product_id) ?? priceOf.get(a.master_product?.id);
              const targetPrice = Number(a.target_price);
              const reached = current != null && current <= targetPrice;
              const progress = current ? Math.min(100, Math.round((targetPrice / current) * 100)) : 0;
              return (
                <li key={a.id} className="animate-fade-up rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex gap-4">
                    <Link href={`/urun/${a.master_product.slug}` as never} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-800">
                      {a.master_product.image_url ? (
                        <Image src={a.master_product.image_url} alt={a.master_product.name} fill sizes="80px" className="object-contain p-2" />
                      ) : (
                        <span className="flex h-full items-center justify-center text-slate-300"><ImageOff className="h-6 w-6" /></span>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/urun/${a.master_product.slug}` as never} className="line-clamp-2 text-sm font-semibold text-slate-900 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400">
                          {a.master_product.name}
                        </Link>
                        <button onClick={() => remove(a.id)} className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" aria-label="Alarmı sil">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-slate-500">Güncel fiyat</p>
                          <p className="font-bold text-slate-900 dark:text-white">{formatPrice(current)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Hedef fiyat</p>
                          <p className="font-bold text-indigo-600 dark:text-indigo-400">{formatPrice(targetPrice, a.currency)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className={cn('h-full rounded-full transition-all duration-700', reached ? 'bg-emerald-500' : 'bg-brand-gradient')} style={{ width: `${progress}%` }} />
                    </div>
                    <p className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                      {reached ? (
                        <span className="flex items-center gap-1 font-semibold text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Hedef fiyata ulaşıldı!</span>
                      ) : (
                        <span>Hedefe %{progress} yakın{current ? ` · ${formatPrice(current - targetPrice)} kaldı` : ''}</span>
                      )}
                      <span>{a.triggered_at ? `Tetiklendi ${timeAgo(a.triggered_at)}` : `Kuruldu ${timeAgo(a.created_at)}`}</span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
