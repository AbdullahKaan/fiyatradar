import { Alert, Linking, Text, TouchableOpacity, View } from 'react-native';
import { ExternalLink } from 'lucide-react-native';
import { formatPrice, type StoreListing } from '@price-compare/shared';

export function StoreListingRow({ listing, isBest }: { listing: StoreListing; isBest?: boolean }) {
  const open = async () => {
    const url = listing.affiliate_url || listing.product_url;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Hata', 'Bağlantı açılamadı.');
    }
  };
  return (
    <View className={`flex-row items-center bg-white rounded-xl p-3 mb-2 border ${isBest ? 'border-primary' : 'border-gray-100'}`}>
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text className="font-semibold text-gray-900">{listing.store?.name ?? 'Mağaza'}</Text>
          {isBest && (
            <View className="bg-primary-100 rounded px-1.5 ml-2">
              <Text className="text-[10px] text-primary-700 font-bold">EN UCUZ</Text>
            </View>
          )}
        </View>
        <View className="flex-row items-center mt-1">
          <View className={`w-2 h-2 rounded-full mr-1.5 ${listing.in_stock ? 'bg-success' : 'bg-gray-300'}`} />
          <Text className="text-xs text-gray-500">{listing.in_stock ? 'Stokta' : 'Stokta yok'}</Text>
        </View>
      </View>
      <View className="items-end mr-3">
        <Text className="font-bold text-gray-900">{formatPrice(listing.current_price, listing.currency)}</Text>
        {listing.discount_percent ? (
          <Text className="text-xs text-red-500 font-semibold">-%{Math.round(listing.discount_percent)}</Text>
        ) : null}
      </View>
      <TouchableOpacity onPress={open} className="bg-primary rounded-lg px-3 py-2 flex-row items-center">
        <Text className="text-white font-semibold mr-1">Git</Text>
        <ExternalLink size={14} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
