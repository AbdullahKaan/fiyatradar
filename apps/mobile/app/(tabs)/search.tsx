import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { PRODUCT_CATEGORIES } from '@price-compare/shared';
import { SearchBar } from '../../components/SearchBar';
import { ProductCard } from '../../components/ProductCard';
import { SkeletonCard } from '../../components/SkeletonCard';
import { searchProducts, type SearchItem } from '../../lib/api';

const PRICE_PRESETS: [string, number | undefined, number | undefined][] = [
  ['Tümü', undefined, undefined],
  ['< 1.000₺', undefined, 1000],
  ['1-5 bin₺', 1000, 5000],
  ['5-20 bin₺', 5000, 20000],
  ['> 20 bin₺', 20000, undefined],
];

export default function SearchScreen() {
  const params = useLocalSearchParams<{ category?: string; q?: string }>();
  const [query, setQuery] = useState(params.q ?? '');
  const [category, setCategory] = useState<string | undefined>(params.category);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [items, setItems] = useState<SearchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    if (params.category) setCategory(params.category);
  }, [params.category]);

  const run = useCallback(
    async (nextPage = 1) => {
      const id = ++reqId.current;
      setLoading(true);
      setError(null);
      try {
        const min = minPrice ? Number(minPrice) : undefined;
        const max = maxPrice ? Number(maxPrice) : undefined;
        const res = await searchProducts(query, category, nextPage, { minPrice: min, maxPrice: max });
        if (id !== reqId.current) return;
        setItems((prev) => (nextPage === 1 ? res.products : [...prev, ...res.products]));
        setTotal(res.pagination.total);
        setPage(res.pagination.page);
        setTotalPages(res.pagination.total_pages);
      } catch (e) {
        if (id === reqId.current) setError((e as Error).message);
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    },
    [query, category, minPrice, maxPrice],
  );

  // Debounced search on any filter change
  useEffect(() => {
    const t = setTimeout(() => run(1), 350);
    return () => clearTimeout(t);
  }, [run]);

  const numeric = (v: string) => v.replace(/[^0-9]/g, '');

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <View className="px-4 pt-3">
        <SearchBar value={query} onChangeText={setQuery} onSubmit={() => run(1)} autoFocus />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="grow-0 mt-3" contentContainerStyle={{ paddingHorizontal: 16 }}>
        {[undefined, ...PRODUCT_CATEGORIES].map((c) => {
          const active = category === c;
          return (
            <Pressable key={c ?? 'all'} onPress={() => setCategory(c)} className={`rounded-full px-4 py-2 mr-2 border ${active ? 'bg-primary border-primary' : 'bg-white border-gray-200'}`}>
              <Text className={active ? 'text-white font-semibold' : 'text-gray-700'}>{c ?? 'Tümü'}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View className="px-4 mt-3">
        <View className="flex-row items-center">
          <TextInput value={minPrice} onChangeText={(v) => setMinPrice(numeric(v))} keyboardType="number-pad" placeholder="Min ₺" placeholderTextColor="#9CA3AF" className="flex-1 bg-white border border-gray-200 rounded-xl px-3 h-10" />
          <Text className="mx-2 text-gray-400">—</Text>
          <TextInput value={maxPrice} onChangeText={(v) => setMaxPrice(numeric(v))} keyboardType="number-pad" placeholder="Max ₺" placeholderTextColor="#9CA3AF" className="flex-1 bg-white border border-gray-200 rounded-xl px-3 h-10" />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2 grow-0">
          {PRICE_PRESETS.map(([label, min, max]) => (
            <Pressable key={label} onPress={() => { setMinPrice(min ? String(min) : ''); setMaxPrice(max ? String(max) : ''); }} className="bg-primary-50 rounded-lg px-3 py-1.5 mr-2">
              <Text className="text-primary-700 text-xs font-medium">{label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text className="text-gray-500 text-sm my-3">{loading && page === 1 ? 'Aranıyor...' : `${total.toLocaleString('tr-TR')} sonuç bulundu`}</Text>
      </View>
      {error ? (
        <Text className="px-4 text-red-500">{error}</Text>
      ) : loading && items.length === 0 ? (
        <View className="px-4">{[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}</View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.product.id}
          renderItem={({ item }) => <ProductCard product={item.product} listings={item.listings} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          onEndReachedThreshold={0.4}
          onEndReached={() => { if (!loading && page < totalPages) run(page + 1); }}
          ListFooterComponent={loading && items.length > 0 ? <SkeletonCard /> : null}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-16">
              <Text className="text-5xl mb-3">🔍</Text>
              <Text className="text-gray-900 font-semibold text-base">Sonuç bulunamadı</Text>
              <Text className="text-gray-500 text-center mt-1 px-8">Farklı bir kelime deneyin veya filtreleri temizleyin.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
