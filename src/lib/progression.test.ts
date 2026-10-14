import { describe, expect, it } from 'vitest';
import { defaultRepRange, defaultStepKg, isProgress, suggestNextSets } from './progression';

const sets = (...pairs: [number, number][]) => pairs.map(([kg, reps]) => ({ kg, reps }));

describe('double progression', () => {
  it('adds a rep while under the top of the range, keeping the pyramid', () => {
    const last = sets([30, 8], [40, 8], [50, 8], [60, 8]);
    expect(suggestNextSets(last, { repMin: 8, repMax: 10, stepKg: 2.5 })).toEqual(sets([30, 9], [40, 9], [50, 9], [60, 9]));
  });

  it('adds weight on sets that reached the top, per set', () => {
    const last = sets([30, 10], [40, 10], [50, 9], [60, 8]);
    expect(suggestNextSets(last, { repMin: 8, repMax: 10, stepKg: 2.5 })).toEqual(sets([32.5, 8], [42.5, 8], [50, 10], [60, 9]));
  });

  it('treats a fixed range (8–8) as "hit the reps → add weight"', () => {
    expect(suggestNextSets(sets([65, 8]), { repMin: 8, repMax: 8, stepKg: 5 })).toEqual(sets([70, 8]));
  });

  it('pulls failed sets up to the bottom of the range first', () => {
    expect(suggestNextSets(sets([60, 5]), { repMin: 8, repMax: 10, stepKg: 2.5 })).toEqual(sets([60, 8]));
  });

  it('only adds reps for bodyweight / unknown-weight sets', () => {
    expect(suggestNextSets(sets([0, 12], [0, 12]), { repMin: 10, repMax: 12, stepKg: 5 })).toEqual(sets([0, 12], [0, 12]));
    expect(suggestNextSets(sets([0, 10]), { repMin: 10, repMax: 15, stepKg: 0 })).toEqual(sets([0, 11]));
  });

  it('avoids float noise and skips empty sets', () => {
    expect(suggestNextSets(sets([17.5, 12], [0, 0]), { repMin: 10, repMax: 12, stepKg: 2.5 })).toEqual(sets([20, 10]));
  });
});

describe('defaults', () => {
  it('picks a weight step from the equipment', () => {
    expect(defaultStepKg('barbell')).toBe(2.5);
    expect(defaultStepKg('dumbbell')).toBe(2);
    expect(defaultStepKg('machine')).toBe(5);
    expect(defaultStepKg('body only')).toBe(0);
    expect(defaultStepKg(undefined)).toBe(5);
  });

  it('infers a rep range from the last session', () => {
    expect(defaultRepRange(sets([30, 8], [40, 8], [50, 8], [60, 6]))).toEqual({ repMin: 8, repMax: 10 });
    expect(defaultRepRange(undefined)).toEqual({ repMin: 8, repMax: 12 });
  });

  it('knows when there is nothing new to suggest', () => {
    expect(isProgress(sets([0, 12]), sets([0, 12]))).toBe(false);
    expect(isProgress(sets([60, 8]), sets([60, 9]))).toBe(true);
  });
});
