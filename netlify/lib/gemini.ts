/**
 * Shared by the Netlify Functions that call Gemini: Firebase sign-in check, model fallback
 * chain, time budget and JSON responses. Lives outside netlify/functions so Netlify doesn't
 * deploy it as a function of its own; esbuild bundles it into each function.
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** The caller's Firebase uid, or null — only signed-in Zid users can spend the Gemini quota. */
export async function verifyUser(req: Request): Promise<string | null> {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!projectId || !token) return null;
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    return typeof payload.sub === 'string' && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * Models tried in order: a pinned Flash model (best estimates), then Google's `-latest`
 * aliases, which keep working when a pinned model is retired (gemini-2.5-flash was closed
 * to new keys in 2026). Override the first with GEMINI_MODEL.
 */
function modelChain(): string[] {
  const primary = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  return [...new Set([primary, 'gemini-flash-lite-latest', 'gemini-flash-latest'])];
}

/** Gemini 3 models accept a thinking level; "low" roughly halves latency with similar estimates. */
const thinkingFor = (model: string) => (/^gemini-3/.test(model) ? { thinkingConfig: { thinkingLevel: 'low' } } : {});

/** Netlify's free tier stops synchronous functions at ~10 s; stay under it. */
const BUDGET_MS = Number(process.env.VISION_BUDGET_MS) || 9_000;
const RETRYABLE = new Set([429, 500, 504]);

export type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };
export type GeminiResult<T> = { data: T; model: string } | { error: string; status: number };

/** Try each model (one quick retry on transient errors) until one answers valid JSON or time runs out. */
export async function callGemini<T>(
  apiKey: string,
  { parts, schema, temperature = 0.2 }: { parts: GeminiPart[]; schema: object; temperature?: number },
): Promise<GeminiResult<T>> {
  const deadline = Date.now() + BUDGET_MS;
  let last = { status: 502, detail: '' };

  for (const [i, model] of modelChain().entries()) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const remaining = deadline - Date.now();
      // The primary model may use at most ~6 s, leaving ~3 s for the fast fallback.
      const timeout = i === 0 ? Math.min(6_000, remaining - 3_000) : remaining;
      if (timeout < 1_500) break;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { temperature, responseMimeType: 'application/json', responseSchema: schema, ...thinkingFor(model) },
        }),
        signal: AbortSignal.timeout(timeout),
      }).catch((e: Error) => e);

      if (res instanceof Error) {
        last = { status: 504, detail: res.message };
        console.error('Gemini timeout', model, res.message);
        break; // too slow: move on to the next model
      }
      if (res.ok) {
        const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
        const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
        try {
          return { data: JSON.parse(text) as T, model };
        } catch {
          console.error('Unparseable Gemini output', model, text.slice(0, 300));
          last = { status: 502, detail: 'unparseable' };
          break;
        }
      }

      last = { status: res.status, detail: (await res.text()).slice(0, 300) };
      console.error('Gemini error', model, res.status, last.detail);
      // Unavailable for this key, or overloaded: move straight to the next model.
      if (res.status === 400 || res.status === 404 || res.status === 503) break;
      if (!RETRYABLE.has(res.status)) return { error: 'AI provider error.', status: 502 };
      await new Promise((r) => setTimeout(r, 400 + attempt * 600));
    }
  }

  if (last.status === 429) return { error: 'AI quota exceeded, try again later.', status: 429 };
  if (last.status === 503 || last.status === 504) return { error: 'The AI service is busy. Please try again in a moment.', status: 503 };
  return { error: 'AI provider error.', status: 502 };
}

/** Same item shape for photos and text descriptions, so the review screen doesn't care. */
export const FOOD_ITEMS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          nameAr: { type: 'STRING' },
          grams: { type: 'NUMBER' },
          kcal: { type: 'NUMBER' },
          protein: { type: 'NUMBER' },
          carbs: { type: 'NUMBER' },
          fat: { type: 'NUMBER' },
          confidence: { type: 'NUMBER' },
        },
        required: ['name', 'nameAr', 'grams', 'kcal', 'protein', 'carbs', 'fat', 'confidence'],
        propertyOrdering: ['name', 'nameAr', 'grams', 'kcal', 'protein', 'carbs', 'fat', 'confidence'],
      },
    },
  },
  required: ['items'],
};

/** Shared nutrition guidance for photo and text estimates. */
export const FOOD_RULES = `- The user is in Tunisia. Dishes may be Tunisian / North African (couscous, brik, lablabi, ojja, chakchouka, mloukhia, kafteji, tabouna or mlawi bread, harissa, merguez, salade mechouia, makroudh, bambalouni…), or ordinary international food.
- kcal/protein/carbs/fat are for THAT portion (not per 100 g), in kcal and grams.
- Account for oil/sauce. Tunisian cooking often uses generous olive oil.
- "name" in short English, "nameAr" the common Arabic / Tunisian name.
- "confidence" 0–1: how sure you are of the identification and portion.`;
