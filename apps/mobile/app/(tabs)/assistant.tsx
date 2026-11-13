import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Send, Sparkles } from 'lucide-react-native';
import type { ChatMessage } from '@price-compare/shared';
import { askAssistant } from '../../lib/api';

const SUGGESTIONS = [
  '10 bin TL altı en iyi telefon hangisi?',
  'iPhone fiyatı düşer mi?',
  'Oyun için hangi laptopu almalıyım?',
  'Sahte indirim nasıl anlaşılır?',
];

export default function AssistantScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Merhaba! 👋 Ben FiyatRadar AI asistanıyım. Ürün önerisi, fiyat analizi veya "şimdi mi almalıyım?" gibi sorularınızı yanıtlayabilirim.', timestamp: new Date().toISOString() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: q, timestamp: new Date().toISOString() }]);
    setLoading(true);
    try {
      const answer = await askAssistant(q);
      setMessages((m) => [...m, { role: 'assistant', content: answer, timestamp: new Date().toISOString() }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: `⚠️ ${(e as Error).message}`, timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <LinearGradient colors={['#6366F1', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center px-5 py-4">
            <View className="bg-white/20 w-10 h-10 rounded-full items-center justify-center mr-3"><Sparkles size={22} color="#fff" /></View>
            <View>
              <Text className="text-white text-lg font-bold">AI Asistan</Text>
              <Text className="text-white/80 text-xs">Gemini destekli alışveriş danışmanı</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 62 : 0}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="grow-0 py-3" contentContainerStyle={{ paddingHorizontal: 16 }}>
          {SUGGESTIONS.map((s) => (
            <Pressable key={s} onPress={() => send(s)} className="bg-white border border-primary-100 rounded-full px-3 py-2 mr-2">
              <Text className="text-primary-700 text-xs">{s}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 16 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View className={`max-w-[85%] rounded-2xl px-4 py-3 mb-3 ${item.role === 'user' ? 'self-end bg-primary rounded-br-sm' : 'self-start bg-white rounded-bl-sm border border-gray-100'}`}>
              <Text className={item.role === 'user' ? 'text-white' : 'text-gray-800'}>{item.content}</Text>
            </View>
          )}
          ListFooterComponent={loading ? (
            <View className="self-start bg-white rounded-2xl px-4 py-3 flex-row items-center border border-gray-100">
              <ActivityIndicator size="small" color="#6366F1" /><Text className="text-gray-500 ml-2">Düşünüyor...</Text>
            </View>
          ) : null}
        />
        <View className="flex-row items-center px-4 py-3 bg-white border-t border-gray-100">
          <TextInput value={input} onChangeText={setInput} onSubmitEditing={() => send()} placeholder="Bir soru sorun..." placeholderTextColor="#9CA3AF" returnKeyType="send" className="flex-1 bg-gray-100 rounded-full px-4 h-11 mr-2" />
          <Pressable onPress={() => send()} disabled={loading || !input.trim()} className={`w-11 h-11 rounded-full items-center justify-center ${input.trim() && !loading ? 'bg-primary' : 'bg-gray-300'}`}>
            <Send size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
