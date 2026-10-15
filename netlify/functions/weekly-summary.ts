/**
 * POST /.netlify/functions/weekly-summary
 * Body: { stats: WeekStats (src/lib/weekly.ts), lang: "en" | "ar" }
 * Auth: "Authorization: Bearer <Firebase ID token>".
 *
 * Only weekly aggregates are sent (averages, counts, PR sets) — never meals, photos or notes.
 * Returns: { headline, wins: string[], focus: string[], tip }
 */
import { callGemini, json, verifyUser } from '../lib/gemini';

const MAX_STATS = 6_000;

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    headline: { type: 'STRING' },
    wins: { type: 'ARRAY', items: { type: 'STRING' } },
    focus: { type: 'ARRAY', items: { type: 'STRING' } },
    tip: { type: 'STRING' },
  },
  required: ['headline', 'wins', 'focus', 'tip'],
  propertyOrdering: ['headline', 'wins', 'focus', 'tip'],
};

const LANGUAGE = {
  en: 'English',
  ar: 'Tunisian Arabic (Darija) written in Arabic script, friendly and simple — gym words like "PR", "sets" or exercise names may stay in Latin letters',
};

const prompt = (stats: string, lang: 'en' | 'ar') => `You are the coach inside Zid, a fitness and nutrition app used in Tunisia. Write a short weekly recap for the user from the numbers below.

Rules:
- Use ONLY these numbers. Never invent foods, exercises, weights or events that aren't in the data.
- "headline": one upbeat sentence (max 90 characters) that captures the week.
- "wins": 1–3 concrete things that went well, each with a number from the data.
- "focus": 1–2 concrete things to improve next week, each with a target (e.g. "Hit 145 g protein on at least 5 days").
- "tip": one practical, specific tip for next week (food, training or recovery). No medical advice, no supplements beyond food.
- Compare with the previous week when it helps. daysLogged 0 means food wasn't logged — say so instead of treating it as fasting.
- Weight: a positive weightGoalKgPerWeek means the user wants to gain (bulk); negative = lose; 0 = maintain; null = not set.
- Each item at most ~140 characters. No emojis in "headline"; at most one emoji per item elsewhere.
- Write everything in ${LANGUAGE[lang]}.

<stats>${stats}</stats>`;

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export default async (req: Request) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const uid = await verifyUser(req);
  if (!uid) return json(401, { error: 'Sign in required.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json(500, { error: 'GEMINI_API_KEY is not configured on the server.' });

  let body: { stats?: unknown; lang?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json(400, { error: 'Invalid JSON body.' });
  }
  const lang = body.lang === 'ar' ? 'ar' : 'en';
  const stats = body.stats && typeof body.stats === 'object' ? JSON.stringify(body.stats) : '';
  if (!stats || stats.length > MAX_STATS) return json(400, { error: 'Missing or oversized stats.' });

  const result = await callGemini<{ headline?: unknown; wins?: unknown; focus?: unknown; tip?: unknown }>(apiKey, {
    parts: [{ text: prompt(stats.replace(/<\/?stats>/gi, ''), lang) }],
    schema: SCHEMA,
    temperature: 0.5,
  });
  if ('error' in result) return json(result.status, { error: result.error });

  const d = result.data;
  const list = (v: unknown, n: number) => (Array.isArray(v) ? v.map((x) => clean(x, 200)).filter(Boolean).slice(0, n) : []);
  const summary = { headline: clean(d.headline, 140), wins: list(d.wins, 3), focus: list(d.focus, 2), tip: clean(d.tip, 240) };
  if (!summary.headline) return json(502, { error: 'AI provider error.' });
  return json(200, { ...summary, model: result.model });
};
