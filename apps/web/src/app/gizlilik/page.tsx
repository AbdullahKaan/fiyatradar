import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Gizlilik Politikası' };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Gizlilik Politikası</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        <p>FiyatRadar, mağazalardaki herkese açık fiyat bilgilerini toplayarak karşılaştırma yapar. Ürün satışı yapmaz; mağaza bağlantılarına tıkladığınızda ilgili mağazanın sitesine yönlendirilirsiniz.</p>
        <p><strong>Favoriler ve karşılaştırma listesi</strong> yalnızca tarayıcınızda (localStorage) saklanır, sunucularımıza gönderilmez.</p>
        <p><strong>Fiyat alarmları</strong> için e-posta adresiniz yalnızca giriş bağlantısı ve alarm bildirimi göndermek amacıyla kullanılır ve üçüncü taraflarla paylaşılmaz.</p>
        <p>Bazı mağaza bağlantıları ortaklık (affiliate) bağlantısı olabilir; bu, ödediğiniz fiyatı değiştirmez.</p>
      </div>
    </div>
  );
}
