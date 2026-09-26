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

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ inline_data: { mime_type: mimeType, data: image } }, { text: PROMPT }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
    signal: AbortSignal.timeout(25_000),
  }).catch((e: Error) => e);

  if (res instanceof Error) return json(504, { error: `Vision request failed: ${res.message}` });
  if (!res.ok) {
    const detail = await res.text();
    console.error('Gemini error', res.status, detail.slice(0, 500));
    return json(res.status === 429 ? 429 : 502, { error: res.status === 429 ? 'Vision quota exceeded, try again later.' : 'Vision provider error.' });
  }

  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  try {
    const parsed = JSON.parse(text) as { items?: unknown[] };
    return json(200, { items: Array.isArray(parsed.items) ? parsed.items : [] });
  } catch {
    console.error('Unparseable Gemini output', text.slice(0, 500));
    return json(502, { error: 'Vision provider returned an unexpected format.' });
  }
};
