/**
 * POST /.netlify/functions/analyze-meal
 * Body: { image: base64 (no data: prefix), mimeType: "image/jpeg", lang?: "en" | "ar" }
 * Auth: "Authorization: Bearer <Firebase ID token>" — only signed-in Zid users can spend the Gemini quota.
 *
 * Returns: { items: [{ name, nameAr, grams, kcal, protein, carbs, fat, confidence }] }
 * The Gemini key stays server-side (GEMINI_API_KEY env var).
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

const MAX_BASE64 = 4_000_000; // ~3 MB image; the client sends ~150 KB

const PROMPT = `You are a nutrition assistant. Identify every distinct food or drink visible in this photo and estimate the portion actually on the plate.

Rules:
- The user is in Tunisia. Dishes may be Tunisian / North African (couscous, brik, lablabi, ojja, chakchouka, mloukhia, kafteji, tabouna or mlawi bread, harissa, merguez, salade mechouia, makroudh, bambalouni…), or ordinary international food.
- List separate components separately (e.g. rice, grilled chicken, salad) rather than one combined dish, unless it is a single mixed dish that can't be separated (e.g. a bowl of lablabi).
- "grams" is the estimated edible weight of that component in the photo. Use visual cues (plate ~26 cm, cutlery, hands) to judge size.
- kcal/protein/carbs/fat are for THAT portion (not per 100 g), in kcal and grams.
- Account for visible oil/sauce. Tunisian cooking often uses generous olive oil.
- "name" in short English, "nameAr" the common Arabic / Tunisian name.
- "confidence" 0–1: how sure you are of the identification and portion.
- If the photo contains no food, return an empty items array.`;

const RESPONSE_SCHEMA = {
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

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

async function verifyUser(req: Request): Promise<string | null> {
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

type GeminiResult = { items: unknown[]; model: string } | { error: string; status: number };

/** Try each model (one quick retry on transient errors) until one answers or time runs out. */
async function callGemini(apiKey: string, image: string, mimeType: string): Promise<GeminiResult> {
  const deadline = Date.now() + BUDGET_MS;
  let last = { status: 502, detail: '' };

  const chain = modelChain();
  for (const [i, model] of chain.entries()) {
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
          contents: [{ role: 'user', parts: [{ inline_data: { mime_type: mimeType, data: image } }, { text: PROMPT }] }],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA, ...thinkingFor(model) },
        }),
        signal: AbortSignal.timeout(timeout),
      }).catch((e: Error) => e);

      if (res instanceof Error) {
        last = { status: 504, detail: res.message };
        console.error('Gemini timeout', model, res.message);
        break; // too slow: move on to the next model
      }
      if (res.ok) {
        const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
        const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
        try {
          const parsed = JSON.parse(text) as { items?: unknown[] };
          return { items: Array.isArray(parsed.items) ? parsed.items : [], model };
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
      if (!RETRYABLE.has(res.status)) return { error: 'Vision provider error.', status: 502 };
      await new Promise((r) => setTimeout(r, 400 + attempt * 600));
    }
  }

  if (last.status === 429) return { error: 'Vision quota exceeded, try again later.', status: 429 };
  if (last.status === 503 || last.status === 504) return { error: 'The vision service is busy. Please try again in a moment.', status: 503 };
  return { error: 'Vision provider error.', status: 502 };
}

export default async (req: Request) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const uid = await verifyUser(req);
  if (!uid) return json(401, { error: 'Sign in required.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json(500, { error: 'GEMINI_API_KEY is not configured on the server.' });

  let body: { image?: string; mimeType?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json(400, { error: 'Invalid JSON body.' });
  }
  const { image, mimeType = 'image/jpeg' } = body;
  if (!image || typeof image !== 'string' || image.length > MAX_BASE64) return json(400, { error: 'Missing or oversized image.' });
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(mimeType)) return json(400, { error: 'Unsupported image type.' });

  const result = await callGemini(apiKey, image, mimeType);
  if ('error' in result) return json(result.status, { error: result.error });
  return json(200, { items: result.items, model: result.model });
};
