import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY tanımlı değil.');
  if (!genAI) genAI = new GoogleGenerativeAI(key);
  return genAI;
}

// Google regularly retires model names; try a configurable model first, then fall back.
const FALLBACK_MODELS = ['gemini-flash-lite-latest', 'gemini-3-flash-preview', 'gemini-flash-latest', 'gemini-3.1-flash-lite-preview'];

function candidateModels(): string[] {
  const fromEnv = (process.env.GEMINI_MODEL ?? '').split(',').map((m) => m.trim()).filter(Boolean);
  return Array.from(new Set([...fromEnv, ...FALLBACK_MODELS]));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

export async function askProductAssistant(question: string, productContext: string): Promise<string> {
  const prompt = `Sen FiyatRadar platformunun AI alışveriş asistanısın. Türkiye'deki en iyi fiyatları bulman için yardım ediyorsun. Sadece Türkçe yanıt ver. Kısa ve net ol.

Mevcut ürün verileri:
${productContext}

Kullanıcı sorusu: ${question}`;

  let lastError: unknown;
  for (const modelName of candidateModels()) {
    try {
      const model = getClient().getGenerativeModel({ model: modelName });
      const result = await withTimeout(model.generateContent(prompt), 20000);
      const text = result.response.text().trim();
      if (text) return text;
      lastError = new Error(`empty response from ${modelName}`);
    } catch (err) {
      lastError = err;
      console.error(`[gemini] model ${modelName} failed:`, err instanceof Error ? err.message : err);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Tüm AI modelleri başarısız oldu.');
}
