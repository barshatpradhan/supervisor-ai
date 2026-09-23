import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
console.log('Key prefix:', apiKey ? apiKey.slice(0, 8) : 'MISSING');

const client = new GoogleGenAI({ apiKey });

try {
  const r = await client.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: 'Say hello as JSON: {"hello":"world"}',
    config: { temperature: 0.2, responseMimeType: 'application/json' },
  });
  console.log('OK:', r.text);
} catch (e: any) {
  console.error('REAL ERROR MESSAGE:', e?.message);
  console.error('REAL ERROR STATUS:', e?.status ?? e?.response?.status);
  console.error('FULL ERROR OBJECT:', JSON.stringify(e, Object.getOwnPropertyNames(e), 2));
}