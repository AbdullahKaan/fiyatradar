import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

export function SkeletonCard({ horizontal = false }: { horizontal?: boolean }) {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View style={{ opacity }} className={`bg-white rounded-2xl p-3 ${horizontal ? 'w-44 mr-3' : 'flex-row mb-3'}`}>
      <View className={`bg-gray-200 rounded-xl ${horizontal ? 'h-32 w-full mb-3' : 'h-20 w-20 mr-3'}`} />
      <View className="flex-1">
        <View className="bg-gray-200 h-3 rounded mb-2 w-11/12" />
        <View className="bg-gray-200 h-3 rounded mb-3 w-2/3" />
        <View className="bg-gray-200 h-4 rounded w-1/2" />
      </View>
    </Animated.View>
  );
}
