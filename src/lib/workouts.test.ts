import { describe, expect, it } from 'vitest';
import { e1rm, isPr, mergeRecord } from './records';
import { estimateWorkoutCalories } from '@/services/calories';
import { DEFAULT_MET } from './defaults';

describe('records', () => {
  it('estimates 1RM with Epley', () => {
    expect(e1rm({ kg: 100, reps: 1 })).toBe(100);
    expect(e1rm({ kg: 100, reps: 10 })).toBe(133.3);
    expect(e1rm({ kg: 100, reps: 0 })).toBe(0);
  });

  it('builds a first record and flags later PRs', () => {
    const first = mergeRecord('Barbell_Squat', '2026-09-01', [{ kg: 80, reps: 8 }, { kg: 90, reps: 5 }], undefined);
    expect(first).toMatchObject({ bestKg: 90, bestKgReps: 5, lastDate: '2026-09-01' });
    expect(isPr({ kg: 90, reps: 5 }, first)).toBe(false);
    expect(isPr({ kg: 92.5, reps: 3 }, first)).toBe(true); // heavier
    expect(isPr({ kg: 85, reps: 10 }, first)).toBe(true); // better e1RM
    expect(isPr({ kg: 90, reps: 5 }, undefined)).toBe(false); // nothing to beat yet
  });

  it('does not let an older edited session overwrite "last time"', () => {
    const rec = mergeRecord('x', '2026-09-10', [{ kg: 50, reps: 10 }], undefined);
    const edited = mergeRecord('x', '2026-09-01', [{ kg: 60, reps: 5 }], rec);
    expect(edited.lastDate).toBe('2026-09-10');
    expect(edited.lastSets).toEqual([{ kg: 50, reps: 10 }]);
    expect(edited.bestKg).toBe(60);
  });
});

describe('calories burned (MET)', () => {
  it('uses MET × kg × hours', () => {
    // 20 sets × 2.5 min = 50 min; 5.0 × 80 × 50/60 = 333.3
    expect(estimateWorkoutCalories(20, 80, 'moderate', DEFAULT_MET)).toBe(333);
  });
  it('falls back to 75 kg when bodyweight is unknown', () => {
    expect(estimateWorkoutCalories(12, null, 'hard', DEFAULT_MET)).toBe(Math.round(6 * 75 * 0.5));
  });
});
