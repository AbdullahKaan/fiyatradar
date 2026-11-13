import '../global.css';
import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { supabase } from '../lib/supabase';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  // System fonts are used; hook kept so custom fonts can be added to this map.
  const [loaded, error] = useFonts({});

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded, error]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' && router.canGoBack()) router.back();
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!loaded && !error) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerTintColor: '#6366F1', headerBackTitle: 'Geri', contentStyle: { backgroundColor: '#F9FAFB' } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ title: 'Ürün Detayı' }} />
      </Stack>
    </>
  );
}
