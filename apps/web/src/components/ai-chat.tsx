'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Loader2, Send, X } from 'lucide-react';
import type { ChatMessage } from '@price-compare/shared';
import { cn } from '@/lib/utils';

const SUGGESTIONS = ['En ucuz iPhone hangisi?', 'Bu ürünü almak için doğru zaman mı?', 'Samsung mı Apple mı daha iyi değer?'];

export function AIChat({ productId }: { productId?: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-ai-chat', handler);
    return () => window.removeEventListener('open-ai-chat', handler);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || loading) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: question, timestamp: new Date().toISOString() }]);
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, product_id: productId }),
      });
      const json = (await res.json()) as { answer?: string; error?: string };
      const content = res.ok && json.answer ? json.answer : json.error ?? 'Bir hata oluştu, lütfen tekrar deneyin.';
      setMessages((m) => [...m, { role: 'assistant', content, timestamp: new Date().toISOString() }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Bağlantı hatası. Lütfen tekrar deneyin.', timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="AI Asistanı aç"
        className="fixed bottom-[calc(1.25rem+var(--compare-bar-h,0px))] right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/40 transition-all hover:scale-105"
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-7 w-7" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.2 }}
            className="card fixed bottom-[calc(6rem+var(--compare-bar-h,0px))] right-4 z-50 flex h-[32rem] max-h-[75vh] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden shadow-2xl"
            role="dialog"
            aria-label="AI Alışveriş Asistanı"
          >
            <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-white">
              <Bot className="h-5 w-5" />
              <div>
                <p className="text-sm font-bold">AI Alışveriş Asistanı</p>
                <p className="text-[11px] opacity-80">Gemini destekli</p>
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-500">Merhaba! Fiyatlar, ürünler ve doğru alım zamanı hakkında soru sorabilirsiniz.</p>
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-left text-sm hover:border-primary hover:text-primary dark:border-slate-700">
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm', m.role === 'user' ? 'rounded-br-sm bg-primary text-white' : 'rounded-bl-sm bg-slate-100 dark:bg-slate-800')}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Düşünüyor...</div>
              )}
              <div ref={endRef} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Sorunuzu yazın..." className="input" aria-label="Mesaj" />
              <button type="submit" disabled={loading || !input.trim()} className="btn-primary px-3" aria-label="Gönder">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
