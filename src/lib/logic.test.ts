import { describe, expect, it } from 'vitest';
import { scaleMacros, sumMacros, toPer100g } from './macros';
import { computeStreak } from './streak';
import { addDays, dayRange } from './dates';
import { findByName, matchesQuery } from './foods';
import type { Food } from '@/types';

describe('macros', () => {
  it('scales per-100g values to a portion', () => {
    expect(scaleMacros({ kcal: 165, protein: 31, carbs: 0, fat: 3.6 }, 200)).toEqual({ kcal: 330, protein: 62, carbs: 0, fat: 7.2 });
  });

  it('round-trips portion → per100g → portion', () => {
    const portion = { kcal: 450, protein: 30, carbs: 50, fat: 12 };
    expect(scaleMacros(toPer100g(portion, 250), 250)).toEqual(portion);
  });

  it('handles zero grams without dividing by zero', () => {
    expect(toPer100g({ kcal: 100, protein: 1, carbs: 1, fat: 1 }, 0)).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it('sums entries', () => {
    expect(sumMacros([{ kcal: 100, protein: 1.25, carbs: 2, fat: 3 }, { kcal: 50, protein: 1.25, carbs: 0, fat: 0 }])).toEqual({ kcal: 150, protein: 2.5, carbs: 2, fat: 3 });
  });
});

describe('dates', () => {
  it('crosses month boundaries', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(dayRange('2026-12-30', '2027-01-02')).toEqual(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
  });
});

describe('streak', () => {
  const today = '2026-09-26';
  it('counts consecutive days including today', () => {
    expect(computeStreak(new Set(['2026-09-24', '2026-09-25', '2026-09-26']), today)).toBe(3);
  });
  it('keeps yesterday’s streak alive before today is logged', () => {
    expect(computeStreak(new Set(['2026-09-24', '2026-09-25']), today)).toBe(2);
  });
  it('breaks on a gap', () => {
    expect(computeStreak(new Set(['2026-09-22', '2026-09-26']), today)).toBe(1);
    expect(computeStreak(new Set(['2026-09-23']), today)).toBe(0);
  });
});

describe('food search', () => {
  const foods = [
    { id: '1', name: 'Fricassé', nameAr: 'فريكاسي' },
    { id: '2', name: 'Chicken breast (cooked)', nameAr: 'صدر دجاج (مطبوخ)' },
  ] as Food[];
  it('ignores accents and case', () => {
    expect(matchesQuery(foods[0], 'FRICASSE')).toBe(true);
  });
  it('matches Arabic and multi-word queries', () => {
    expect(matchesQuery(foods[1], 'دجاج')).toBe(true);
    expect(matchesQuery(foods[1], 'breast chicken')).toBe(true);
    expect(matchesQuery(foods[1], 'tuna')).toBe(false);
  });
  it('finds exact name matches for AI items', () => {
    expect(findByName(foods, 'fricasse')?.id).toBe('1');
    expect(findByName(foods, 'something', 'فريكاسي')?.id).toBe('1');
    expect(findByName(foods, 'chicken')).toBeUndefined();
  });
});
