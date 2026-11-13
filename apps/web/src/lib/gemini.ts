import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY tanımlı değil.');
  if (!genAI) genAI = new GoogleGenerativeAI(key);
  return genAI;
}

export async function askProductAssistant(question: string, productContext: string): Promise<string> {
  const model = getClient().getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `Sen FiyatRadar platformunun AI alışveriş asistanısın. Türkiye'deki en iyi fiyatları bulman için yardım ediyorsun. Sadece Türkçe yanıt ver. Kısa ve net ol.

Mevcut ürün verileri:
${productContext}

Kullanıcı sorusu: ${question}`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
