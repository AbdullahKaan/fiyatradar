import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { Bell } from 'lucide-react-native';
import { formatPrice, type MasterProduct, type PriceHistory, type StoreListing } from '@price-compare/shared';
import { AIVerdictBadge } from '../../components/AIVerdictBadge';
import { StoreListingRow } from '../../components/StoreListingRow';
import { createAlert, getPriceHistory, getProduct, getProductListings } from '../../lib/api';
import { supabase } from '../../lib/supabase';

const WIDTH = Dimensions.get('window').width - 32;

/** Daily min price across stores, max 30 points for readability. */
function chartData(history: PriceHistory[]) {
  const byDay = new Map<string, number>();
  for (const h of history) {
    const d = h.recorded_at.slice(0, 10);
    byDay.set(d, Math.min(byDay.get(d) ?? Infinity, h.price));
  }
  const entries = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-30);
  const step = Math.max(1, Math.ceil(entries.length / 5));
  return {
    labels: entries.map(([d], i) => (i % step === 0 ? `${d.slice(8, 10)}.${d.slice(5, 7)}` : '')),
    data: entries.map(([, v]) => v),
  };
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<MasterProduct | null>(null);
  const [listings, setListings] = useState<StoreListing[]>([]);
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [target, setTarget] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const p = await getProduct(id);
        if (!p) throw new Error('Ürün bulunamadı.');
        setProduct(p);
        const [l, h] = await Promise.all([getProductListings(p.id), getPriceHistory(p.id, 90)]);
        setListings([...l].sort((a, b) => Number(b.in_stock) - Number(a.in_stock) || a.current_price - b.current_price));
        setHistory(h);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const chart = useMemo(() => chartData(history), [history]);
  const best = listings.find((l) => l.in_stock) ?? listings[0];
  const analysis = product?.ai_price_analysis;

  const openSheet = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      Alert.alert('Giriş gerekli', 'Fiyat alarmı kurmak için giriş yapmalısınız.', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Giriş Yap', onPress: () => router.push('/alerts') },
      ]);
      return;
    }
    if (best) setTarget(String(Math.floor(best.current_price * 0.9)));
    setSheet(true);
  };

  const saveAlert = async () => {
    const value = Number(target);
    if (!product || !Number.isFinite(value) || value <= 0) {
      Alert.alert('Uyarı', 'Geçerli bir hedef fiyat girin.');
      return;
    }
    setSaving(true);
    try {
      await createAlert(product.id, value);
      setSheet(false);
      Alert.alert('Alarm kuruldu', `Fiyat ${formatPrice(value)} altına düştüğünde haber vereceğiz.`);
    } catch (e) {
      Alert.alert('Hata', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#6366F1" /></View>;
  if (error || !product) return <View className="flex-1 items-center justify-center px-6"><Text className="text-red-500 text-center">{error ?? 'Ürün bulunamadı.'}</Text></View>;

  return (
    <>
      <Stack.Screen options={{ title: product.brand || 'Ürün Detayı' }} />
      <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <View className="bg-white rounded-2xl h-64 items-center justify-center mb-4 overflow-hidden">
          {product.image_url && !imgError ? (
            <Image source={{ uri: product.image_url }} className="w-full h-full" resizeMode="contain" onError={() => setImgError(true)} />
          ) : (
            <Text className="text-6xl">📦</Text>
          )}
        </View>
        <Text className="text-xs text-gray-500">{product.brand} · {product.category}</Text>
        <Text className="text-xl font-bold text-gray-900 mt-1 mb-2">{product.name}</Text>
        <View className="flex-row items-center mb-4">
          <AIVerdictBadge verdict={analysis?.verdict} size="lg" />
          {best && <Text className="text-2xl font-extrabold text-primary ml-auto">{formatPrice(best.current_price, best.currency)}</Text>}
        </View>

        {analysis && (
          <View className="bg-primary-50 rounded-2xl p-4 mb-4">
            <Text className="font-bold text-primary-700 mb-1">✨ AI Fiyat Analizi</Text>
            {analysis.fake_discount_detected && (
              <View className="bg-red-100 rounded-lg p-2 mb-2"><Text className="text-red-700 text-xs font-semibold">⚠ Sahte indirim tespit edildi: fiyat indirimden önce yükseltilmiş.</Text></View>
            )}
            <Text className="text-gray-700 leading-5">{analysis.summary}</Text>
            <View className="flex-row mt-3">
              <View className="flex-1"><Text className="text-[11px] text-gray-500">6 ay en düşük</Text><Text className="font-semibold">{formatPrice(analysis.lowest_6m)}</Text></View>
              <View className="flex-1"><Text className="text-[11px] text-gray-500">6 ay en yüksek</Text><Text className="font-semibold">{formatPrice(analysis.highest_6m)}</Text></View>
              <View className="flex-1"><Text className="text-[11px] text-gray-500">Ortalamaya göre</Text><Text className={`font-semibold ${analysis.current_vs_avg_percent <= 0 ? 'text-success' : 'text-danger'}`}>{analysis.current_vs_avg_percent > 0 ? '+' : ''}{analysis.current_vs_avg_percent.toFixed(1)}%</Text></View>
            </View>
          </View>
        )}

        <Text className="text-lg font-bold text-gray-900 mb-2">Mağaza Fiyatları ({listings.length})</Text>
        {listings.length === 0 ? (
          <Text className="text-gray-500 mb-4">Bu ürün için mağaza fiyatı bulunamadı.</Text>
        ) : (
          listings.map((l) => <StoreListingRow key={l.id} listing={l} isBest={l.id === best?.id} />)
        )}

        <Text className="text-lg font-bold text-gray-900 mt-4 mb-2">Fiyat Geçmişi (90 gün)</Text>
        {chart.data.length >= 2 ? (
          <View className="bg-white rounded-2xl py-3 items-center">
            <LineChart
              data={{ labels: chart.labels, datasets: [{ data: chart.data }] }}
              width={WIDTH - 8}
              height={200}
              yAxisSuffix="₺"
              formatYLabel={(v) => Math.round(Number(v)).toLocaleString('tr-TR')}
              withDots={chart.data.length < 15}
              withInnerLines={false}
              bezier
              chartConfig={{
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (o = 1) => `rgba(99, 102, 241, ${o})`,
                labelColor: () => '#6B7280',
                propsForDots: { r: '3' },
              }}
              style={{ borderRadius: 16 }}
            />
          </View>
        ) : (
          <View className="bg-white rounded-2xl p-6 items-center"><Text className="text-gray-500">Grafik için yeterli fiyat verisi yok.</Text></View>
        )}

        {product.description ? (
          <>
            <Text className="text-lg font-bold text-gray-900 mt-4 mb-2">Açıklama</Text>
            <Text className="text-gray-700 leading-5">{product.description}</Text>
          </>
        ) : null}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100">
        <Pressable onPress={openSheet} className="bg-primary rounded-xl h-12 flex-row items-center justify-center">
          <Bell size={18} color="#fff" /><Text className="text-white font-semibold ml-2">Fiyat Alarmı Kur</Text>
        </Pressable>
      </View>

      <Modal visible={sheet} transparent animationType="slide" onRequestClose={() => setSheet(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end">
          <Pressable className="flex-1 bg-black/40" onPress={() => setSheet(false)} />
          <View className="bg-white rounded-t-3xl p-6">
            <View className="w-10 h-1 bg-gray-300 rounded-full self-center mb-4" />
            <Text className="text-lg font-bold text-gray-900">Fiyat Alarmı Kur</Text>
            <Text className="text-gray-500 mt-1 mb-4">{best ? `Şu anki en iyi fiyat: ${formatPrice(best.current_price)}` : 'Hedef fiyatınızı girin.'}</Text>
            <TextInput value={target} onChangeText={(v) => setTarget(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="Hedef fiyat (₺)" placeholderTextColor="#9CA3AF" autoFocus className="border border-gray-200 rounded-xl px-4 h-12 text-lg mb-4" />
            <Pressable onPress={saveAlert} disabled={saving} className="bg-primary rounded-xl h-12 items-center justify-center">
              {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">Alarmı Kaydet</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
