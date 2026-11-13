import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-6xl font-extrabold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-bold">Sayfa bulunamadı</h1>
      <p className="mt-2 text-slate-500">Aradığınız ürün veya sayfa mevcut değil.</p>
      <Link href="/" className="btn-primary mt-6">Ana Sayfaya Dön</Link>
    </div>
  );
}
