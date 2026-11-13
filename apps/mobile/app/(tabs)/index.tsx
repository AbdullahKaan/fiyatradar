import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Zap } from 'lucide-react-native';
import { PRODUCT_CATEGORIES } from '@price-compare/shared';
import { SearchBar } from '../../components/SearchBar';
import { ProductCard } from '../../components/ProductCard';
import { SkeletonCard } from '../../components/SkeletonCard';
import { searchProducts, type SearchItem } from '../../lib/api';

export default function HomeScreen() {
  const [deals, setDeals] = useState<SearchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [storeCount, setStoreCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await searchProducts('', undefined, 1, { sort: 'deals', inStock: true });
      // AI-approved: drop products flagged as fake discounts
      const items = res.products.filter((p) => !p.product.ai_price_analysis?.fake_discount_detected);
      setDeals(items);
      setTotal(res.pagination.total);
      setStoreCount(new Set(res.products.flatMap((p) => p.listings.map((l) => l.store_id))).size);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const goSearch = (category?: string) =>
    router.push(category ? { pathname: '/search', params: { category } } : '/search');

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#6366F1" />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View className="flex-row items-center px-5 pt-3 pb-4">
          <View className="bg-primary w-9 h-9 rounded-xl items-center justify-center mr-2">
            <Zap size={20} color="#fff" fill="#fff" />
          </View>
          <Text className="text-2xl font-extrabold text-gray-900">Fiyat<Text className="text-primary">Radar</Text></Text>
        </View>

        <View className="px-5 mb-4">
          <Text className="text-gray-600 mb-3">En ucuz fiyatı AI ile bul, sahte indirimlere kanma.</Text>
          <SearchBar value="" onChangeText={() => undefined} onPress={() => goSearch()} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }} className="mb-5">
          {PRODUCT_CATEGORIES.map((c) => (
            <Pressable key={c} onPress={() => goSearch(c)} className="bg-white border border-gray-200 rounded-full px-4 py-2 mr-2">
              <Text className="text-gray-700 font-medium">{c}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View className="flex-row mx-5 mb-5 bg-primary-50 rounded-2xl py-3">
          {[
            [total.toLocaleString('tr-TR'), 'ürün'],
            [String(storeCount), 'mağaza'],
            ['✨', 'AI destekli'],
          ].map(([v, l]) => (
            <View key={l} className="flex-1 items-center">
              <Text className="text-lg font-bold text-primary-700">{v}</Text>
              <Text className="text-xs text-gray-600">{l}</Text>
            </View>
          ))}
        </View>

        <View className="px-5 mb-3 flex-row justify-between items-center">
          <Text className="text-lg font-bold text-gray-900">Günün Fırsatları (AI Onaylı)</Text>
          <Pressable onPress={() => goSearch()}><Text className="text-primary font-semibold">Tümü</Text></Pressable>
        </View>

        {loading ? (
          <ScrollView horizontal contentContainerStyle={{ paddingHorizontal: 20 }}>
            {[0, 1, 2].map((i) => <SkeletonCard key={i} horizontal />)}
          </ScrollView>
        ) : error ? (
          <Text className="px-5 text-red-500">{error}</Text>
        ) : deals.length === 0 ? (
          <Text className="px-5 text-gray-500">Şu an onaylı fırsat bulunmuyor.</Text>
        ) : (
          <FlatList
            horizontal
            data={deals}
            keyExtractor={(i) => i.product.id}
            renderItem={({ item }) => <ProductCard product={item.product} listings={item.listings} horizontal />}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
