/**
 * Food photo / text analysis — the ONE place that knows which AI provider is used.
 *
 * Today: Gemini, via the Netlify Functions `analyze-meal` and `describe-meal` (API key stays server-side).
 * To switch to Claude / OpenAI: change the function (or add a new one) and keep the
 * `DetectedFood[]` contract below. Nothing else in the app needs to change.
 */
import { auth } from './firebase';

export interface DetectedFood {
  name: string;
  nameAr: string;
  /** Estimated edible grams in the photo. */
  grams: number;
  /** Macros for that portion (not per 100 g). */
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** 0–1 */
  confidence: number;
}

export class VisionError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

/** POST to one of our Gemini functions with the user's Firebase ID token. */
export async function callAiFunction<T>(name: string, payload: unknown): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new VisionError('Not signed in', 401);
  const res = await fetch(`/.netlify/functions/${name}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new VisionError(body.error ?? `HTTP ${res.status}`, res.status);
  return body;
}

const toItems = (body: { items?: unknown[] }) => (body.items ?? []).map(sanitize).filter((x): x is DetectedFood => x !== null);

export async function analyzeMealPhoto(image: Blob): Promise<DetectedFood[]> {
  const payload = { image: await blobToBase64(image), mimeType: image.type || 'image/jpeg' };
  return toItems(await callAiFunction<{ items?: unknown[] }>('analyze-meal', payload));
}

/** "2 œufs, une tabouna, harissa" → the same items a photo gives. */
export async function describeMeal(text: string): Promise<DetectedFood[]> {
  return toItems(await callAiFunction<{ items?: unknown[] }>('describe-meal', { text }));
}

/** Guard against odd model output: coerce numbers, drop empty rows. */
function sanitize(raw: unknown): DetectedFood | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0);
  const name = typeof r.name === 'string' ? r.name.trim().slice(0, 100) : '';
  if (!name) return null;
  return {
    name,
    nameAr: typeof r.nameAr === 'string' ? r.nameAr.trim().slice(0, 100) : '',
    grams: Math.round(n(r.grams)) || 100,
    kcal: Math.round(n(r.kcal)),
    protein: n(r.protein),
    carbs: n(r.carbs),
    fat: n(r.fat),
    confidence: Math.min(1, n(r.confidence)),
  };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
