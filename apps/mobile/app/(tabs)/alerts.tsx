import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Bell, Plus, Trash2 } from 'lucide-react-native';
import type { Session } from '@supabase/supabase-js';
import { formatPrice } from '@price-compare/shared';
import { supabase } from '../../lib/supabase';
import { deleteAlert, getMyAlerts, type AlertWithPrice } from '../../lib/api';

function LoginPrompt() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const submit = async () => {
    if (!email.includes('@') || password.length < 6) {
      Alert.alert('Uyarı', 'Geçerli bir e-posta ve en az 6 karakterli şifre girin.');
      return;
    }
    setBusy(true);
    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) Alert.alert('Hata', error.message);
    else if (mode === 'signup') Alert.alert('Başarılı', 'Hesabınız oluşturuldu. Gerekirse e-postanızı doğrulayın.');
  };

  return (
    <View className="flex-1 justify-center px-6">
      <View className="items-center mb-6">
        <View className="bg-primary-100 w-16 h-16 rounded-full items-center justify-center mb-3"><Bell size={30} color="#6366F1" /></View>
        <Text className="text-xl font-bold text-gray-900">Fiyat alarmları için giriş yapın</Text>
        <Text className="text-gray-500 text-center mt-1">Hedef fiyata düştüğünde size haber verelim.</Text>
      </View>
      <TextInput value={email} onChangeText={setEmail} placeholder="E-posta" autoCapitalize="none" keyboardType="email-address" placeholderTextColor="#9CA3AF" className="bg-white border border-gray-200 rounded-xl px-4 h-12 mb-3" />
      <TextInput value={password} onChangeText={setPassword} placeholder="Şifre" secureTextEntry placeholderTextColor="#9CA3AF" className="bg-white border border-gray-200 rounded-xl px-4 h-12 mb-4" />
      <Pressable onPress={submit} disabled={busy} className="bg-primary rounded-xl h-12 items-center justify-center">
        {busy ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">{mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}</Text>}
      </Pressable>
      <Pressable onPress={() => setMode(mode === 'login' ? 'signup' : 'login')} className="mt-4 items-center">
        <Text className="text-primary">{mode === 'login' ? 'Hesabınız yok mu? Kayıt olun' : 'Zaten hesabınız var mı? Giriş yapın'}</Text>
      </Pressable>
    </View>
  );
}

export default function AlertsScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [alerts, setAlerts] = useState<AlertWithPrice[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      setAlerts(await getMyAlerts());
    } catch (e) {
      Alert.alert('Hata', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const remove = (id: string) =>
    Alert.alert('Alarmı sil', 'Bu fiyat alarmını silmek istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive', onPress: async () => {
          try { await deleteAlert(id); setAlerts((a) => a.filter((x) => x.id !== id)); }
          catch (e) { Alert.alert('Hata', (e as Error).message); }
        },
      },
    ]);

  if (!ready) return <View className="flex-1 items-center justify-center"><ActivityIndicator color="#6366F1" /></View>;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-3 pb-3">
        <Text className="text-2xl font-bold text-gray-900">Fiyat Alarmları</Text>
        {session && <Pressable onPress={() => supabase.auth.signOut()}><Text className="text-gray-500">Çıkış</Text></Pressable>}
      </View>
      {!session ? (
        <LoginPrompt />
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(a) => a.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor="#6366F1" />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, flexGrow: 1 }}
          renderItem={({ item }) => {
            const reached = item.best_price != null && item.best_price <= item.target_price;
            return (
              <Pressable onPress={() => router.push(`/product/${item.master_product_id}`)} className="bg-white rounded-2xl p-4 mb-3 flex-row items-center">
                <View className="flex-1">
                  <Text numberOfLines={2} className="font-semibold text-gray-900">{item.master_product?.name ?? 'Ürün'}</Text>
                  <Text className="text-sm text-gray-500 mt-1">Hedef: <Text className="font-semibold text-primary">{formatPrice(item.target_price, item.currency)}</Text></Text>
                  <Text className="text-sm text-gray-500">En iyi fiyat: <Text className={`font-semibold ${reached ? 'text-success' : 'text-gray-900'}`}>{item.best_price != null ? formatPrice(item.best_price) : '—'}</Text>{reached ? ' 🎉' : ''}</Text>
                </View>
                <Pressable onPress={() => remove(item.id)} hitSlop={10} className="p-2"><Trash2 size={20} color="#EF4444" /></Pressable>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-16">
              <Text className="text-5xl mb-3">🔔</Text>
              <Text className="text-gray-900 font-semibold">Henüz alarmınız yok</Text>
              <Text className="text-gray-500 text-center mt-1 px-8">Bir ürün sayfasından "Fiyat Alarmı Kur" ile ekleyebilirsiniz.</Text>
            </View>
          }
          ListFooterComponent={
            <Pressable onPress={() => router.push('/search')} className="bg-primary rounded-xl h-12 flex-row items-center justify-center mt-2">
              <Plus size={18} color="#fff" /><Text className="text-white font-semibold ml-1">Yeni Alarm Ekle</Text>
            </Pressable>
          }
        />
      )}
    </SafeAreaView>
  );
}
