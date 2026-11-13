import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { Search, X } from 'lucide-react-native';

interface Props extends Omit<TextInputProps, 'onChange'> {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit?: () => void;
  onPress?: () => void;
}

/** Search bar; when `onPress` is given it acts as a non-editable button (e.g. on home). */
export function SearchBar({ value, onChangeText, onSubmit, onPress, ...rest }: Props) {
  const content = (
    <View className="flex-row items-center bg-white rounded-2xl px-4 h-14 border border-gray-200 shadow-sm">
      <Search size={20} color="#6366F1" />
      <TextInput
        className="flex-1 ml-3 text-base text-gray-900"
        placeholder="Ürün, marka veya model ara..."
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        editable={!onPress}
        pointerEvents={onPress ? 'none' : 'auto'}
        {...rest}
      />
      {!!value && !onPress && (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityLabel="Temizle">
          <X size={18} color="#9CA3AF" />
        </Pressable>
      )}
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}
