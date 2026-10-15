import { describe, expect, it } from 'vitest';
import { proteinIdeas } from './protein';
import { daysBetween, weighInStatus } from './weighIn';
import { ALL_PLATES, platesPerSide, warmupSets } from './plates';
import type { Food, SavedMeal } from '@/types';

const food = (id: string, name: string, kcal: number, protein: number, extra: Partial<Food> = {}): Food => ({
  id,
  name,
  per100g: { kcal, protein, carbs: 0, fat: 0 },
  favorite: false,
  source: 'seed',
  createdAt: 0,
  ...extra,
});

const foods = [
  food('chicken', 'Chicken breast', 165, 31),
  food('eggs', 'Eggs', 143, 12.6),
  food('tuna', 'Tuna in oil', 198, 26),
  food('bread', 'Baguette', 270, 9), // 13% of kcal from protein → not a protein source
  food('lben', 'Lben', 40, 3.3), // too little per 100 g
];

describe('protein ideas', () => {
  const base = { proteinLeft: 33, kcalLeft: 600, foods, savedMeals: [] as SavedMeal[], recent: [], label: (f: Food) => f.name };

  it('sizes a portion of a protein-dense food to close the gap', () => {
    const ideas = proteinIdeas(base);
    expect(ideas.map((i) => i.id)).not.toContain('bread');
    expect(ideas.map((i) => i.id)).not.toContain('lben');
    const chicken = ideas.find((i) => i.id === 'chicken')!;
    expect(chicken.grams).toBe(110); // 33 / 0.31 ≈ 106 → rounded to 10 g
    expect(chicken.protein).toBe(34);
    expect(chicken.fits).toBe(true);
  });

  it('puts foods you actually eat first', () => {
    const ideas = proteinIdeas({ ...base, recent: Array(5).fill({ foodId: 'tuna', foodName: 'Tuna in oil' }) });
    expect(ideas[0].id).toBe('tuna');
  });

  it('prefers options that fit the calories left', () => {
    const ideas = proteinIdeas({ ...base, kcalLeft: 150, recent: Array(5).fill({ foodId: 'tuna', foodName: 'Tuna in oil' }) });
    // Tuna 130 g ≈ 257 kcal doesn't fit 150+100; chicken 110 g ≈ 182 kcal does.
    expect(ideas[0].id).toBe('chicken');
    expect(ideas.find((i) => i.id === 'tuna')?.fits).toBe(false);
  });

  it('suggests a saved meal that covers most of the gap', () => {
    const shake: SavedMeal = {
      id: 'shake',
      name: 'Shake post-séance',
      createdAt: 0,
      useCount: 6,
      items: [{ foodName: 'Whey', grams: 30, kcal: 120, protein: 24, carbs: 3, fat: 1.5 }],
    };
    const ideas = proteinIdeas({ ...base, savedMeals: [shake] });
    expect(ideas[0]).toMatchObject({ kind: 'saved', id: 'shake', protein: 24 });
  });

  it('stays quiet when the gap is small', () => {
    expect(proteinIdeas({ ...base, proteinLeft: 6 })).toEqual([]);
  });
});

describe('weigh-in status', () => {
  it('counts calendar days', () => {
    expect(daysBetween('2026-10-05', '2026-10-15')).toBe(10);
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2); // across a DST change
  });

  it('is due without weigh-ins, after 3 days, or on a chosen day', () => {
    expect(weighInStatus(undefined, '2026-10-15')).toMatchObject({ due: true, daysAgo: null });
    expect(weighInStatus('2026-10-14', '2026-10-15')).toMatchObject({ due: false, daysAgo: 1 });
    expect(weighInStatus('2026-10-12', '2026-10-15')).toMatchObject({ due: true, daysAgo: 3 });
    // 2026-10-15 is a Thursday (4).
    expect(weighInStatus('2026-10-14', '2026-10-15', [1, 4])).toMatchObject({ due: true, scheduledToday: true });
    // Already weighed in today: never due.
    expect(weighInStatus('2026-10-15', '2026-10-15', [4]).due).toBe(false);
  });
});

describe('plates', () => {
  it('loads a barbell per side, heaviest first', () => {
    expect(platesPerSide(100, 20)).toEqual({ perSide: [25, 15], loadedKg: 100, exact: true });
    expect(platesPerSide(62.5, 20)).toEqual({ perSide: [20, 1.25], loadedKg: 62.5, exact: true });
    expect(platesPerSide(20, 20).perSide).toEqual([]);
  });

  it('gets as close as possible with the plates you have', () => {
    const r = platesPerSide(62.5, 20, [20, 10, 5]);
    expect(r).toMatchObject({ perSide: [20], loadedKg: 60, exact: false });
  });

  it('handles plate-loaded machines without a bar', () => {
    expect(platesPerSide(90, 0, ALL_PLATES).perSide).toEqual([25, 20]);
  });

  it('ramps warm-ups to loadable weights', () => {
    expect(warmupSets(60, { barKg: 20, step: 2.5 })).toEqual([
      { kg: 20, reps: 10 },
      { kg: 25, reps: 8 },
      { kg: 35, reps: 5 },
      { kg: 47.5, reps: 3 },
    ]);
    // Dumbbells: no empty-bar set, 2 kg steps.
    expect(warmupSets(30, { barKg: 0, step: 2 })).toEqual([
      { kg: 12, reps: 8 },
      { kg: 18, reps: 5 },
      { kg: 24, reps: 3 },
    ]);
    // Light work weight: steps that collapse together are dropped.
    expect(warmupSets(25, { barKg: 20, step: 2.5 })).toEqual([{ kg: 20, reps: 10 }]);
  });
});
