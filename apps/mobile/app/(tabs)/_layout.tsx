import { Tabs } from 'expo-router';
import { Bell, Home, Search, Sparkles } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { height: 62, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Ana Sayfa', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tabs.Screen name="search" options={{ title: 'Ara', tabBarIcon: ({ color, size }) => <Search color={color} size={size} /> }} />
      <Tabs.Screen name="alerts" options={{ title: 'Fiyat Alarmları', tabBarIcon: ({ color, size }) => <Bell color={color} size={size} /> }} />
      <Tabs.Screen name="assistant" options={{ title: 'AI Asistan', tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} /> }} />
    </Tabs>
  );
}
