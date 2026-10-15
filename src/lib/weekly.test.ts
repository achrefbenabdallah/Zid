import { describe, expect, it } from 'vitest';
import { isEmptyWeek, weekStats, type WeekInput } from './weekly';
import { DEFAULT_GOALS } from './defaults';
import type { MuscleGroup, Workout } from '@/types';

const wk = (id: string, date: string, exerciseId: string, sets: [number, number][]): Workout => ({
  id,
  date,
  startedAt: 0,
  intensity: 'moderate',
  caloriesBurned: 0,
  exercises: [{ exerciseId, sets: sets.map(([kg, reps]) => ({ kg, reps })) }],
});

const groups: Record<string, MuscleGroup> = { squat: 'quadriceps', row: 'back' };

const base: WeekInput = {
  weekStart: '2026-10-05',
  meals: [
    // Previous week: 1 day
    { date: '2026-09-30', kcal: 2500, protein: 100, carbs: 300, fat: 80 },
    // This week: 2 days
    { date: '2026-10-05', kcal: 2000, protein: 100, carbs: 250, fat: 60 },
    { date: '2026-10-05', kcal: 900, protein: 50, carbs: 100, fat: 20 }, // same day, 2nd meal
    { date: '2026-10-07', kcal: 2600, protein: 120, carbs: 330, fat: 70 },
  ],
  days: [
    { date: '2026-10-07', trainingDay: true, waterMl: 2000 },
    { date: '2026-10-05', waterMl: 3000 },
  ],
  workouts: [
    wk('a', '2026-09-29', 'squat', [[80, 5]]),
    wk('b', '2026-10-07', 'squat', [[85, 5], [80, 5]]),
    wk('c', '2026-10-08', 'row', [[50, 10]]),
  ],
  weights: [
    { date: '2026-09-28', kg: 67.2 },
    { date: '2026-10-05', kg: 67.7 },
  ],
  goals: { ...DEFAULT_GOALS, protein: 145 },
  goalRateKgPerWeek: 0.25,
  groupOf: (id) => groups[id],
  exerciseName: (id) => id,
  muscleName: (g) => g,
};

describe('weekly stats', () => {
  const s = weekStats(base);

  it('averages nutrition over logged days only', () => {
    expect(s.weekEnd).toBe('2026-10-11');
    expect(s.nutrition).toMatchObject({ daysLogged: 2, avgKcal: 2750, avgProteinG: 135, avgWaterMl: 2500 });
    // 150 g on the 5th hits ≥90% of 145; 120 g doesn't.
    expect(s.nutrition.proteinGoalDays).toBe(1);
    // 2900 vs 2900 rest goal ✓; 2600 vs 3100 training goal ✗ (−16%).
    expect(s.nutrition.kcalOnTargetDays).toBe(1);
  });

  it('summarises training with PRs set this week', () => {
    expect(s.training).toMatchObject({ sessions: 2, sets: 3, prs: [{ exercise: 'squat', set: '85 kg × 5' }] });
    expect(s.training.musclesBelowRange).toEqual(expect.arrayContaining(['quadriceps', 'back', 'chest']));
  });

  it('compares weight and the previous week', () => {
    expect(s.bodyweight).toEqual({ weighIns: 1, latestKg: 67.7, changeKgVsPreviousWeek: 0.5 });
    expect(s.previousWeek).toEqual({ daysLogged: 1, avgKcal: 2500, avgProteinG: 100, sessions: 1, sets: 1 });
  });

  it('knows when there is nothing to summarise', () => {
    expect(isEmptyWeek(s)).toBe(false);
    expect(isEmptyWeek(weekStats({ ...base, weekStart: '2027-01-04' }))).toBe(true);
  });
});
