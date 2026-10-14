import { describe, expect, it } from 'vitest';
import { draftFromTemplate, progressionFor, templateCandidates, templateFromExercises } from './templates';
import type { ExerciseRecord, Workout, WorkoutTemplate } from '@/types';

const equipment = (id: string) => (id === 'Barbell_Squat' ? 'barbell' : id === 'Leg_Extensions' ? 'machine' : undefined);

const legDay: Workout = {
  id: 'w24',
  date: '2026-09-24',
  startedAt: 1,
  intensity: 'moderate',
  caloriesBurned: 260,
  session: 'Jambes',
  exercises: [
    { exerciseId: 'Barbell_Squat', name: 'Squat', sets: [{ kg: 30, reps: 8 }, { kg: 40, reps: 8 }, { kg: 50, reps: 8 }, { kg: 60, reps: 8 }] },
    { exerciseId: 'custom:mollets-2', name: 'Mollets 2', sets: [{ kg: 50, reps: 10 }, { kg: 40, reps: 10 }] },
  ],
};

describe('templates', () => {
  it('turns a session into a template with inferred progression', () => {
    const tpl = templateFromExercises(' Jambes ', legDay.exercises, equipment);
    expect(tpl.name).toBe('Jambes');
    expect(tpl.exercises).toEqual([
      { exerciseId: 'Barbell_Squat', name: 'Squat', sets: 4, repMin: 8, repMax: 10, stepKg: 2.5 },
      { exerciseId: 'custom:mollets-2', name: 'Mollets 2', sets: 2, repMin: 10, repMax: 12, stepKg: 5 },
    ]);
  });

  it('starts a session pre-filled with last time, or empty sets without history', () => {
    const tpl: WorkoutTemplate = templateFromExercises('Jambes', legDay.exercises, equipment);
    const records = new Map<string, ExerciseRecord>([
      ['Barbell_Squat', { exerciseId: 'Barbell_Squat', lastDate: '2026-09-24', lastSets: legDay.exercises[0].sets, bestKg: 60, bestKgReps: 8, best1rm: 76 }],
    ]);
    const d = draftFromTemplate(tpl, records);
    expect(d).toMatchObject({ session: 'Jambes', templateId: tpl.id, existing: false });
    expect(d.exercises[0].sets.map((s) => [s.kg, s.reps, s.done])).toEqual([[30, 8, false], [40, 8, false], [50, 8, false], [60, 8, false]]);
    expect(d.exercises[1]).toMatchObject({ name: 'Mollets 2', repMin: 10, repMax: 12, stepKg: 5 });
    expect(d.exercises[1].sets).toEqual([{ kg: 0, reps: 10, done: false }, { kg: 0, reps: 10, done: false }]);
  });

  it('uses template settings, else infers progression from history and equipment', () => {
    expect(progressionFor({ exerciseId: 'Barbell_Squat', repMin: 6, repMax: 8, stepKg: 5 }, undefined, equipment)).toEqual({ repMin: 6, repMax: 8, stepKg: 5 });
    const rec = { exerciseId: 'Leg_Extensions', lastDate: 'x', lastSets: [{ kg: 65, reps: 12 }], bestKg: 65, bestKgReps: 12, best1rm: 0 };
    expect(progressionFor({ exerciseId: 'Leg_Extensions' }, rec, equipment)).toEqual({ repMin: 12, repMax: 14, stepKg: 5 });
  });

  it('offers each named past session once, skipping existing templates', () => {
    const older = { ...legDay, id: 'old', date: '2026-09-10' };
    const circuit = { ...legDay, id: 'c', date: '2026-09-22', session: 'Circuit' };
    const unnamed = { ...legDay, id: 'u', session: undefined };
    const existing = [{ id: 't', name: 'circuit', exercises: [], createdAt: 0 }];
    expect(templateCandidates([older, legDay, circuit, unnamed], existing).map((w) => w.id)).toEqual(['w24']);
  });
});
