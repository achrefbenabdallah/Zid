import { describe, expect, it } from 'vitest';
import { doneExercises, exerciseHistory, setsPerMuscle, volumeStatus, weekStart } from './training';
import type { MuscleGroup, Workout, WorkoutSet } from '@/types';

const w = (id: string, date: string, exercises: [string, WorkoutSet[]][]): Workout => ({
  id,
  date,
  startedAt: 0,
  intensity: 'moderate',
  caloriesBurned: 0,
  exercises: exercises.map(([exerciseId, sets]) => ({ exerciseId, sets })),
});
const s = (kg: number, reps: number): WorkoutSet => ({ kg, reps });

const workouts = [
  w('w3', '2026-10-12', [['squat', [s(80, 8), s(85, 5)]], ['curl', [s(12, 10)]]]),
  w('w1', '2026-10-01', [['squat', [s(70, 8), s(75, 6), s(0, 0)]]]),
  w('w2', '2026-10-05', [['squat', [s(75, 8), s(75, 8)]], ['bench', [s(60, 8)]]]),
  w('w4', '2026-10-14', [['squat', [s(80, 5)]]]), // weaker day: no PR
];

describe('exercise history', () => {
  const h = exerciseHistory(workouts, 'squat');

  it('lists sessions oldest first with top set, e1RM and volume', () => {
    expect(h.sessions.map((x) => x.date)).toEqual(['2026-10-01', '2026-10-05', '2026-10-12', '2026-10-14']);
    expect(h.sessions[0]).toMatchObject({ top: s(75, 6), volume: 70 * 8 + 75 * 6 });
    expect(h.sessions[0].sets).toHaveLength(2); // empty set ignored
    expect(h.totalSets).toBe(7);
  });

  it('replays PRs in date order (first session is the baseline)', () => {
    // 05 Oct: 75×8 ties the weight but beats e1RM (95 > 90). 12 Oct: 80×8 and 85×5 are PRs; the heaviest is shown.
    expect(h.prs.map((p) => [p.date, p.set, p.kinds])).toEqual([
      ['2026-10-12', s(85, 5), ['weight', 'e1rm']],
      ['2026-10-05', s(75, 8), ['e1rm']],
    ]);
    expect(h.bestKg).toEqual(s(85, 5));
    expect(h.best1rm).toBeCloseTo(101.3, 1); // 80×8 (Epley) beats 85×5 (99.2)
  });

  it('lists exercises you have done, most recent first', () => {
    expect(doneExercises(workouts).map((d) => [d.exerciseId, d.sessions])).toEqual([
      ['squat', 4],
      ['curl', 1],
      ['bench', 1],
    ]);
  });
});

describe('weekly sets per muscle', () => {
  it('starts weeks on Monday', () => {
    expect(weekStart('2026-10-15')).toBe('2026-10-12'); // Thursday
    expect(weekStart('2026-10-12')).toBe('2026-10-12'); // Monday
    expect(weekStart('2026-10-18')).toBe('2026-10-12'); // Sunday
  });

  it('counts completed sets per primary muscle in the range', () => {
    const groups: Record<string, MuscleGroup> = { squat: 'quadriceps', curl: 'biceps' };
    const v = setsPerMuscle(workouts, (id) => groups[id], '2026-10-12', '2026-10-18');
    expect(v.sets.get('quadriceps')).toBe(3);
    expect(v.sets.get('biceps')).toBe(1);
    expect(v.unassigned).toBe(0);
    const all = setsPerMuscle(workouts, (id) => groups[id], '2026-01-01', '2026-12-31');
    expect(all.unassigned).toBe(1); // bench has no group here
  });

  it('rates volume against the weekly range', () => {
    expect(volumeStatus('back', 0)).toBe('none');
    expect(volumeStatus('back', 6)).toBe('low');
    expect(volumeStatus('back', 14)).toBe('good');
    expect(volumeStatus('back', 24)).toBe('high');
    expect(volumeStatus('calves', 6)).toBe('good'); // smaller muscles: 6–16
  });
});
