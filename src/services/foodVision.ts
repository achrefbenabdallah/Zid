/**
 * Food photo analysis — the ONE place that knows which vision provider is used.
 *
 * Today: Gemini, via the Netlify Function `analyze-meal` (keeps the API key server-side).
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

const ENDPOINT = '/.netlify/functions/analyze-meal';

export class VisionError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

export async function analyzeMealPhoto(image: Blob): Promise<DetectedFood[]> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new VisionError('Not signed in', 401);

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ image: await blobToBase64(image), mimeType: image.type || 'image/jpeg' }),
  });
  const body = (await res.json().catch(() => ({}))) as { items?: unknown[]; error?: string };
  if (!res.ok) throw new VisionError(body.error ?? `HTTP ${res.status}`, res.status);
  return (body.items ?? []).map(sanitize).filter((x): x is DetectedFood => x !== null);
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
