import { describe, expect, it } from 'vitest';
import { computeAdaptive, linearTrend, type AdaptiveInput } from './adaptive';
import { addDays } from './dates';

const today = '2026-10-28';
const days = (n: number) => Array.from({ length: n }, (_, i) => addDays(today, -i));

/** 28 days eating 3000 kcal while weight climbs 65.0 → 66.0 kg (linear). */
const base: AdaptiveInput = {
  today,
  intake: days(28).map((date) => ({ date, kcal: 3000 })),
  weights: days(28)
    .filter((_, i) => i % 3 === 0)
    .map((date, i) => ({ date, kg: 66 - (1 / 27) * (i * 3) })), // weigh-in every 3rd day
  trainingDays: 12, // 3/week
  goalRateKgPerWeek: 0.25,
  current: { kcal: 2900, kcalTraining: 3100, protein: 145, fat: 70 },
};

describe('adaptive calorie target', () => {
  it('estimates maintenance from intake minus the weight trend', () => {
    const r = computeAdaptive(base);
    if (r.status === 'needData') throw new Error('should have enough data');
    // +1 kg over 27 days = +0.259 kg/week ≈ 285 kcal/day of surplus → TDEE ≈ 2715
    expect(r.trendKgPerWeek).toBeCloseTo(0.26, 2);
    expect(r.tdee).toBeGreaterThan(2700);
    expect(r.tdee).toBeLessThan(2730);
    expect(r.status).toBe('ok');
    // Goal +0.25 kg/week → +275 kcal/day → ≈2990 average.
    expect(r.targetAvg).toBeGreaterThan(2980);
    expect(r.targetAvg).toBeLessThan(3000);
  });

  it('keeps the training-day gap and splits so the weekly average hits the target', () => {
    const r = computeAdaptive(base);
    if (r.status === 'needData') throw new Error('should have enough data');
    expect(r.recommended.kcalTraining - r.recommended.kcal).toBe(200);
    const weeklyAvg = (r.recommended.kcal * 4 + r.recommended.kcalTraining * 3) / 7;
    expect(Math.abs(weeklyAvg - r.targetAvg)).toBeLessThanOrEqual(25); // rounding to 50 kcal
    expect(r.recommended.kcal % 50).toBe(0);
    // Carbs fill what protein (145×4) and fat (70×9) leave.
    expect(r.recommended.carbs).toBe(Math.round((r.recommended.kcal - 580 - 630) / 4));
  });

  it('recommends eating less when gaining faster than the goal', () => {
    const fast = computeAdaptive({ ...base, goalRateKgPerWeek: 0 });
    if (fast.status === 'needData') throw new Error('x');
    expect(fast.delta).toBeLessThan(0);
  });

  it('treats unlogged days as missing, not as zero', () => {
    const sparse = computeAdaptive({ ...base, intake: base.intake.filter((_, i) => i % 2 === 0) });
    if (sparse.status === 'needData') throw new Error('x');
    expect(sparse.avgIntake).toBe(3000);
    expect(sparse.loggedDays).toBe(14);
  });

  it('says what data is missing', () => {
    expect(computeAdaptive({ ...base, weights: base.weights.slice(0, 2) })).toMatchObject({ status: 'needData', weighIns: 2 });
    expect(computeAdaptive({ ...base, intake: base.intake.slice(0, 6) })).toMatchObject({ status: 'needData', loggedDays: 6 });
    // Three weigh-ins within a few days aren't enough to see a trend.
    const close = [today, addDays(today, -2), addDays(today, -4)].map((date) => ({ date, kg: 65 }));
    expect(computeAdaptive({ ...base, weights: close })).toMatchObject({ status: 'needData', weightSpanDays: 4 });
  });

  it('ignores data outside the 28-day window and flags implausible results', () => {
    const old = { ...base, intake: [...base.intake, { date: addDays(today, -60), kcal: 9000 }] };
    const r = computeAdaptive(old);
    if (r.status === 'needData') throw new Error('x');
    expect(r.avgIntake).toBe(3000);
    // Logging only part of the food: 900 kcal/day while gaining → maintenance < 1200 → unreliable.
    const partial = computeAdaptive({ ...base, intake: base.intake.map((d) => ({ ...d, kcal: 900 })) });
    expect(partial.status).toBe('unreliable');
  });

  it('fits a straight line', () => {
    expect(linearTrend([{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }], 3)).toEqual({ slope: 2, value: 7 });
  });
});
