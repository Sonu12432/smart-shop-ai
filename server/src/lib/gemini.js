import { config } from '../config.js';

export const geminiEnabled = () => Boolean(config.geminiKey);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Minimal Gemini REST client (no SDK needed).
 * json=true  -> asks for application/json and returns the parsed object
 * json=false -> returns plain text
 */
export async function gemini({ system, prompt, json = true, temperature = 0.2 }) {
  if (!geminiEnabled()) throw new Error('GEMINI_API_KEY is not set');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent`;
  const generationConfig = { temperature };
  if (json) generationConfig.responseMimeType = 'application/json';
  // 2.5-flash "thinks" by default, which adds seconds of latency; not needed for extraction.
  if (/2\.5-flash/.test(config.geminiModel)) generationConfig.thinkingConfig = { thinkingBudget: 0 };

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig,
  });

  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.geminiKey },
        body,
        signal: AbortSignal.timeout(25000),
      });
      if (!res.ok) {
        const msg = (await res.text()).slice(0, 300);
        if ([429, 500, 503].includes(res.status) && attempt === 0) {
          await sleep(900);
          continue;
        }
        throw new Error(`Gemini ${res.status}: ${msg}`);
      }
      const data = await res.json();
      const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
      if (!text) throw new Error('Gemini returned an empty response');
      return json ? JSON.parse(text.replace(/^```json|^```|```$/gm, '').trim()) : text;
    } catch (err) {
      lastErr = err;
      if (attempt === 0 && err.name === 'TimeoutError') continue;
      break;
    }
  }
  throw lastErr;
}
