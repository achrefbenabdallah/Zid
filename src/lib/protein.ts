import type { Food, MealEntry, SavedMeal } from '@/types';
import { normalize } from './foods';
import { sumMacros } from './macros';

/** One way to close today's protein gap: a portion of a food, or a saved meal. */
export interface ProteinIdea {
  kind: 'food' | 'saved';
  id: string;
  name: string;
  /** Portion for foods (saved meals are logged as saved). */
  grams?: number;
  protein: number;
  kcal: number;
  /** Fits in the calories left today (with a small margin). */
  fits: boolean;
}

export interface ProteinIdeaInput {
  proteinLeft: number;
  kcalLeft: number;
  foods: Food[];
  savedMeals: SavedMeal[];
  /** Recent entries — foods you actually eat rank first. */
  recent: Pick<MealEntry, 'foodId' | 'foodName'>[];
  /** Display name for a food (language-aware). */
  label: (f: Food) => string;
  max?: number;
}

/** Below this the gap isn't worth a suggestion. */
export const MIN_PROTEIN_GAP = 10;
/** A food only counts as a protein source if ≥30% of its calories come from protein… */
const MIN_PROTEIN_SHARE = 0.3;
/** …and it has a meaningful amount per 100 g. */
const MIN_PROTEIN_PER_100 = 8;
/** Largest single portion we'd suggest. */
const MAX_PORTION_G = 250;
const KCAL_MARGIN = 100;

const share = (protein: number, kcal: number) => (kcal > 0 ? (protein * 4) / kcal : 0);

/**
 * Foods from My Foods (and saved meals) that close the protein gap within the calories left.
 * Ranking: fits the calorie budget → covers the gap → you eat it often → protein-dense.
 */
export function proteinIdeas(input: ProteinIdeaInput): ProteinIdea[] {
  const { proteinLeft, kcalLeft, foods, savedMeals, recent, label, max = 3 } = input;
  if (proteinLeft < MIN_PROTEIN_GAP) return [];

  const byId = new Map<string, number>();
  const byName = new Map<string, number>();
  for (const e of recent) {
    if (e.foodId) byId.set(e.foodId, (byId.get(e.foodId) ?? 0) + 1);
    const n = normalize(e.foodName);
    byName.set(n, (byName.get(n) ?? 0) + 1);
  }
  const budget = kcalLeft + KCAL_MARGIN;

  const scored: { idea: ProteinIdea; score: number }[] = [];

  for (const f of foods) {
    const p = f.per100g;
    if (p.protein < MIN_PROTEIN_PER_100 || share(p.protein, p.kcal) < MIN_PROTEIN_SHARE) continue;
    const exact = (proteinLeft / p.protein) * 100;
    const grams = Math.min(MAX_PORTION_G, Math.max(30, Math.round(exact / 10) * 10));
    const protein = Math.round((p.protein * grams) / 100);
    const kcal = Math.round((p.kcal * grams) / 100);
    const uses = (byId.get(f.id) ?? 0) + (byName.get(normalize(f.name)) ?? 0) + (f.nameAr ? (byName.get(normalize(f.nameAr)) ?? 0) : 0);
    const fits = kcal <= budget;
    scored.push({
      idea: { kind: 'food', id: f.id, name: label(f), grams, protein, kcal, fits },
      score: rank(fits, protein / proteinLeft, uses + (f.favorite ? 2 : 0), share(p.protein, p.kcal)),
    });
  }

  for (const sm of savedMeals) {
    const m = sumMacros(sm.items);
    if (m.protein < Math.min(20, proteinLeft * 0.6) || share(m.protein, m.kcal) < 0.25) continue;
    const protein = Math.round(m.protein);
    const fits = m.kcal <= budget;
    scored.push({
      idea: { kind: 'saved', id: sm.id, name: sm.name, protein, kcal: m.kcal, fits },
      score: rank(fits, protein / proteinLeft, sm.useCount ?? 0, share(m.protein, m.kcal)),
    });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((s) => s.idea);
}

function rank(fits: boolean, coverage: number, uses: number, density: number): number {
  return (fits ? 1000 : 0) + Math.min(coverage, 1) * 200 + Math.min(uses, 10) * 15 + density * 100;
}
