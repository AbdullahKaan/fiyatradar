import { useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { formatPrice, type MasterProduct, type StoreListing } from '@price-compare/shared';
import { AIVerdictBadge } from './AIVerdictBadge';
import { bestListing } from '../lib/api';

interface Props {
  product: MasterProduct;
  listings: StoreListing[];
  horizontal?: boolean;
}

export function ProductCard({ product, listings, horizontal = false }: Props) {
  const [imgError, setImgError] = useState(false);
  const best = bestListing(listings);
  const discount = best?.discount_percent ?? 0;
  const fake = product.ai_price_analysis?.fake_discount_detected;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => router.push(`/product/${product.id}`)}
      className={`bg-white rounded-2xl p-3 shadow-sm ${horizontal ? 'w-44 mr-3' : 'flex-row mb-3'}`}
    >
      <View className={`bg-gray-50 rounded-xl items-center justify-center overflow-hidden ${horizontal ? 'h-32 w-full mb-2' : 'h-24 w-24 mr-3'}`}>
        {product.image_url && !imgError ? (
          <Image source={{ uri: product.image_url }} className="w-full h-full" resizeMode="contain" onError={() => setImgError(true)} />
        ) : (
          <Text className="text-3xl">📦</Text>
        )}
        {discount > 10 && !fake && (
          <View className="absolute top-1 left-1 bg-red-500 rounded-md px-1.5 py-0.5">
            <Text className="text-white text-[10px] font-bold">%{Math.round(discount)}</Text>
          </View>
        )}
      </View>
      <View className="flex-1">
        <Text className="text-[11px] text-gray-500 mb-0.5">{product.brand}</Text>
        <Text numberOfLines={2} className="text-sm font-medium text-gray-900 mb-1">{product.name}</Text>
        {best ? (
          <View className="flex-row items-end mb-1">
            <Text className="text-base font-bold text-primary">{formatPrice(best.current_price, best.currency)}</Text>
            {best.original_price && best.original_price > best.current_price ? (
              <Text className="text-[11px] text-gray-400 line-through ml-1.5">{formatPrice(best.original_price, best.currency)}</Text>
            ) : null}
          </View>
        ) : (
          <Text className="text-xs text-gray-400 mb-1">Fiyat yok</Text>
        )}
        <View className="flex-row items-center flex-wrap gap-1">
          <AIVerdictBadge verdict={product.ai_price_analysis?.verdict} />
          {fake && <Text className="text-[10px] text-red-600 font-semibold">⚠ Sahte indirim</Text>}
        </View>
        {listings.length > 1 && <Text className="text-[10px] text-gray-400 mt-1">{listings.length} mağazada</Text>}
      </View>
    </TouchableOpacity>
  );
}
