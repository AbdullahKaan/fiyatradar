import { Text, View } from 'react-native';
import type { AIPriceAnalysis } from '@price-compare/shared';

const STYLES: Record<AIPriceAnalysis['verdict'], { label: string; bg: string; fg: string }> = {
  BUY_NOW: { label: 'Şimdi Al', bg: 'bg-emerald-100', fg: 'text-emerald-700' },
  GOOD_DEAL: { label: 'İyi Fırsat', bg: 'bg-indigo-100', fg: 'text-indigo-700' },
  WAIT: { label: 'Bekle', bg: 'bg-amber-100', fg: 'text-amber-700' },
  OVERPRICED: { label: 'Pahalı', bg: 'bg-red-100', fg: 'text-red-700' },
};

export function AIVerdictBadge({ verdict, size = 'sm' }: { verdict?: AIPriceAnalysis['verdict'] | null; size?: 'sm' | 'lg' }) {
  if (!verdict || !STYLES[verdict]) return null;
  const s = STYLES[verdict];
  return (
    <View className={`${s.bg} rounded-full self-start ${size === 'lg' ? 'px-3 py-1.5' : 'px-2 py-0.5'}`}>
      <Text className={`${s.fg} font-semibold ${size === 'lg' ? 'text-sm' : 'text-[10px]'}`}>✨ {s.label}</Text>
    </View>
  );
}
