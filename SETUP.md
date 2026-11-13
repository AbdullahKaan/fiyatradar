# FiyatRadar - Kurulum Kılavuzu

## Supabase Veritabanı
Proje URL: https://cxoduuotlbcqhyovzwqi.supabase.co
(Anahtarlar güvenli olarak yapılandırılmıştır)

## Hızlı Başlangıç

### Web Uygulaması (Vercel'e Deploy)
1. GitHub'a yükleyin: `git push origin main`
2. Vercel.com → Import Project → apps/web seçin
3. Environment variables'ı Vercel dashboard'dan ekleyin (apps/web/.env.local içeriği)
4. Deploy!

### Mobil Uygulama (Expo)
1. `cd apps/mobile && npm install`
2. `npx expo start` → QR kodu telefona okutun (Expo Go app)
3. Yayın için: `npx eas build --platform all`

### Veri Toplama (Scraper)
1. GitHub repository oluşturun ve Secrets ekleyin:
   - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, AFFILIATE_TAG
2. Scraper her 6 saatte bir otomatik çalışır

### Supabase Şeması
Şema zaten uygulandı. Manuel olarak uygulamak için:
Supabase Dashboard → SQL Editor → supabase/schema.sql içeriğini yapıştırın.

## Mimari
- Web: Next.js 14 + Supabase + Gemini AI → Vercel Free Tier
- Mobil: Expo (iOS & Android) → Expo Go / EAS Build
- Veri: Python scraper → GitHub Actions (6 saatlik cron)
- AI: Google Gemini (text-embedding-004 + gemini-2.5-flash) → Free Tier
