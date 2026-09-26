import { scaleMacros } from '@/lib/macros';
import type { Macros, MealType } from '@/types';

/** An item on the review screen — nothing is persisted until the user confirms. */
export interface DraftItem {
  key: string;
  name: string;
  nameAr?: string;
  grams: number;
  /** Source of truth for macros: portion macros are always derived as per100g × grams. */
  per100g: Macros;
  foodId?: string;
  origin: 'ai' | 'food' | 'barcode' | 'custom';
  confidence?: number;
}

export const itemMacros = (i: DraftItem): Macros => scaleMacros(i.per100g, i.grams);

export function defaultMealType(d = new Date()): MealType {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h < 10.5) return 'breakfast';
  if (h < 12) return 'snack';
  if (h < 15.5) return 'lunch';
  if (h < 19) return 'snack';
  return 'dinner';
}
