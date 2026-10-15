/**
 * POST /.netlify/functions/analyze-meal
 * Body: { image: base64 (no data: prefix), mimeType: "image/jpeg", lang?: "en" | "ar" }
 * Auth: "Authorization: Bearer <Firebase ID token>" — only signed-in Zid users can spend the Gemini quota.
 *
 * Returns: { items: [{ name, nameAr, grams, kcal, protein, carbs, fat, confidence }] }
 * The Gemini key stays server-side (GEMINI_API_KEY env var).
 */
import { FOOD_ITEMS_SCHEMA, FOOD_RULES, callGemini, json, verifyUser } from '../lib/gemini';

const MAX_BASE64 = 4_000_000; // ~3 MB image; the client sends ~150 KB

const PROMPT = `You are a nutrition assistant. Identify every distinct food or drink visible in this photo and estimate the portion actually on the plate.

Rules:
${FOOD_RULES}
- List separate components separately (e.g. rice, grilled chicken, salad) rather than one combined dish, unless it is a single mixed dish that can't be separated (e.g. a bowl of lablabi).
- "grams" is the estimated edible weight of that component in the photo. Use visual cues (plate ~26 cm, cutlery, hands) to judge size.
- If the photo contains no food, return an empty items array.`;

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

  const result = await callGemini<{ items?: unknown[] }>(apiKey, {
    parts: [{ inline_data: { mime_type: mimeType, data: image } }, { text: PROMPT }],
    schema: FOOD_ITEMS_SCHEMA,
  });
  if ('error' in result) return json(result.status, { error: result.error });
  return json(200, { items: Array.isArray(result.data.items) ? result.data.items : [], model: result.model });
};
