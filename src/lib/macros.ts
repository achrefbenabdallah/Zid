import type { Macros } from '@/types';

export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

/** Scale per-100g macros to a gram amount, rounded for display/storage. */
export function scaleMacros(per100g: Macros, grams: number): Macros {
  const f = grams / 100;
  return {
    kcal: Math.round(per100g.kcal * f),
    protein: round1(per100g.protein * f),
    carbs: round1(per100g.carbs * f),
    fat: round1(per100g.fat * f),
  };
}

/** Inverse of scaleMacros: derive per-100g values from a portion. */
export function toPer100g(m: Macros, grams: number): Macros {
  if (grams <= 0) return { ...ZERO };
  const f = 100 / grams;
  return { kcal: Math.round(m.kcal * f), protein: round1(m.protein * f), carbs: round1(m.carbs * f), fat: round1(m.fat * f) };
}

export function sumMacros(items: Macros[]): Macros {
  const t = items.reduce(
    (a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat }),
    { ...ZERO },
  );
  return { kcal: Math.round(t.kcal), protein: round1(t.protein), carbs: round1(t.carbs), fat: round1(t.fat) };
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function uid(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 20);
}
