import type { Metadata } from 'next';
import { AlertsClient } from './alerts-client';

export const metadata: Metadata = { title: 'Fiyat Alarmları' };

export default function AlertsPage() {
  return (
    <div className="mx-auto max-w-6xl animate-fadeIn px-4 py-10">
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">🔔 Fiyat Takibi</span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Fiyat Alarmları</h1>
        <p className="mt-2 text-slate-500">Hedef fiyatınızı belirleyin, fiyat düştüğünde size e-posta ile haber verelim.</p>
      </div>
      <AlertsClient />
    </div>
  );
}
