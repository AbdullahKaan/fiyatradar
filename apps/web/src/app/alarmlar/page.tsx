import type { Metadata } from 'next';
import { AlertsClient } from './alerts-client';

export const metadata: Metadata = { title: 'Fiyat Alarmları' };

export default function AlertsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold">Fiyat Alarmları</h1>
      <p className="mt-1 text-sm text-slate-500">Hedef fiyata ulaşıldığında size haber veririz.</p>
      <AlertsClient />
    </div>
  );
}
