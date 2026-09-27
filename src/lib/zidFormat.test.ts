import { describe, expect, it } from 'vitest';
import {
  buildZidExport,
  isValidDate,
  mapMealType,
  matchExercise,
  mealKey,
  parseZidExport,
  setWeights,
  stableHash,
  type ExportSource,
} from './zidFormat';
import { DEFAULT_GOALS, DEFAULT_MET, DEFAULT_REMINDERS } from './defaults';

/** Mirrors the quirks of a real export: text weights, duplicate rows, numbered machines, pyramids. */
const sample = {
  schemaVersion: 1,
  app: 'Zid',
  exportedAt: '2026-09-27',
  extraField: 'ignored',
  profile: { sex: 'male', age: 31, heightCm: 182, startWeightKg: 65.6, startBodyFatPct: 11.8 },
  goals: { kcal: 2900, protein: 145, carbs: 420, fat: 70, kcalTrainingDay: 3200 },
  foods: [
    { name: 'Poulet (blanc, cuit)', per100g: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 } },
    { name: 'Pain tabouna', per100g: { kcal: 270, protein: 8.5, carbs: 54, fat: 2 } },
    { name: 'Merguez (cuit)', per100g: { kcal: 300, protein: 16, carbs: 1, fat: 26 } },
    { name: 'Œuf entier', per100g: { kcal: 143, protein: 12.6, carbs: 0.7, fat: 9.5 } },
  ],
  mealEntries: [
    { date: '2026-09-21', mealType: 'Déjeuner', foodName: 'Poulet (blanc, cuit)', grams: 200, kcal: 330, protein: 62, carbs: 0, fat: 7.2 },
    { date: '2026-09-26', mealType: 'Collation', foodName: 'Pomme', grams: 90, kcal: 47, protein: 0.3, carbs: 12.6, fat: 0.2 },
    { date: '2026-09-26', mealType: 'Collation', foodName: 'Pomme', grams: 90, kcal: 47, protein: 0.3, carbs: 12.6, fat: 0.2 },
    { date: '2026-09-26', mealType: 'Dîner (tacos)', foodName: 'Merguez (cuit)', grams: 120, kcal: 360, protein: 19.2, carbs: 1.2, fat: 31.2 },
  ],
  workouts: [
    { date: '2026-09-21', session: 'Circuit', exercise: 'Squat', chargeKg: 'léger', reps: [10, 10], notes: 'reprise, machines' },
    { date: '2026-09-22', session: 'Circuit', exercise: 'Dos (machine) 1', chargeKg: 'léger', reps: [10, 10], notes: 'reprise, machines' },
    { date: '2026-09-24', session: 'Jambes', exercise: 'Squat', chargeKg: 60, reps: [8, 8, 8, 8], notes: '30/40/50/60 kg (pyramide)' },
    { date: '2026-09-24', session: 'Jambes', exercise: 'Mollets 2', chargeKg: 50, reps: [10, 10], notes: '50/40 kg' },
  ],
  weightLogs: [{ date: '2026-09-21', weightKg: 65.6, bodyFatPct: 11.8, arm: null, chest: null, thigh: null, waist: null }],
};

describe('parseZidExport — valid files', () => {
  it('accepts the format (JSON text, BOM, unknown fields ignored)', () => {
    const r = parseZidExport('﻿' + JSON.stringify(sample));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.foods).toHaveLength(4);
    expect(r.data.mealEntries).toHaveLength(4);
    expect(r.data.workouts).toHaveLength(4);
    expect(r.data.goals.kcalTrainingDay).toBe(3200);
  });

  it('keeps text weights like "léger" and treats null numbers as absent', () => {
    const r = parseZidExport(sample);
    if (!r.ok) throw new Error('should parse');
    expect(r.data.workouts[0].chargeKg).toBe('léger');
    expect(r.data.weightLogs[0]).toEqual({ date: '2026-09-21', weightKg: 65.6, bodyFatPct: 11.8 });
  });

  it('keeps accents, ligatures and parentheses in names verbatim', () => {
    const r = parseZidExport(sample);
    if (!r.ok) throw new Error('should parse');
    expect(r.data.foods.map((f) => f.name)).toContain('Œuf entier');
    expect(r.data.mealEntries[3].mealType).toBe('Dîner (tacos)');
  });

  it('treats missing arrays as empty', () => {
    const r = parseZidExport({ schemaVersion: 1 });
    expect(r.ok && r.data.foods.length === 0 && r.data.workouts.length === 0).toBe(true);
  });
});

describe('parseZidExport — invalid files are rejected, with paths', () => {
  const bad = (patch: object) => parseZidExport({ ...sample, ...patch });

  it('rejects broken JSON and wrong schema', () => {
    expect(parseZidExport('{ nope')).toEqual({ ok: false, errors: [{ path: '', code: 'invalidJson' }] });
    expect(parseZidExport('[]')).toMatchObject({ ok: false, errors: [{ code: 'notObject' }] });
    expect(bad({ schemaVersion: 2 })).toMatchObject({ ok: false, errors: [{ path: 'schemaVersion', code: 'schemaVersion' }] });
  });

  it('names the exact row and field', () => {
    const r = bad({
      mealEntries: [
        { ...sample.mealEntries[0], date: '21/09/2026' },
        { ...sample.mealEntries[0], kcal: null },
        { ...sample.mealEntries[0], grams: '200g' },
      ],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toEqual([
      { path: 'mealEntries[0].date', code: 'badDate', got: '"21/09/2026"' },
      { path: 'mealEntries[1].kcal', code: 'required', got: undefined },
      { path: 'mealEntries[2].grams', code: 'notNumber', got: '"200g"' },
    ]);
  });

  it('rejects impossible dates, empty reps, negative numbers, non-arrays', () => {
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(bad({ workouts: [{ ...sample.workouts[0], reps: [] }] })).toMatchObject({ ok: false, errors: [{ code: 'emptyReps' }] });
    expect(bad({ weightLogs: [{ date: '2026-09-21', weightKg: -3 }] })).toMatchObject({ ok: false, errors: [{ code: 'negative' }] });
    expect(bad({ foods: { name: 'x' } })).toMatchObject({ ok: false, errors: [{ path: 'foods', code: 'notArray' }] });
  });
});

describe('mapping', () => {
  it('maps French meal labels (with notes in brackets)', () => {
    const labels = ['Petit-déj', 'Déjeuner', 'Dîner', 'Dîner (tacos)', 'Collation', 'Avant séance', 'Après séance', 'lunch', 'غداء'];
    expect(labels.map((l) => mapMealType(l).type)).toEqual([
      'breakfast',
      'lunch',
      'dinner',
      'dinner',
      'snack',
      'preWorkout',
      'postWorkout',
      'lunch',
      'lunch',
    ]);
    expect(mapMealType('Brunch')).toEqual({ type: 'snack', known: false });
  });

  it('matches exercise names to the library, keeps numbered/generic ones custom', () => {
    expect(matchExercise('Squat')).toBe('Barbell_Squat');
    expect(matchExercise('Développé couché (bench press)')).toBe('Barbell_Bench_Press_-_Medium_Grip');
    expect(matchExercise('Tirage horizontal (dos)')).toBe('Seated_Cable_Rows');
    expect(matchExercise('Avant-bras (curl poignets)')).toBe('Seated_Dumbbell_Palms-Up_Wrist_Curl');
    expect(matchExercise('Trapèze (shrugs)')).toBe('Barbell_Shrug');
    expect(matchExercise('Soulevé de terre')).toBe('Barbell_Deadlift');
    expect(matchExercise('Barbell Squat')).toBe('Barbell_Squat'); // our own export
    expect(matchExercise('Mollets 1')).toBeNull();
    expect(matchExercise('Dos (machine) 2')).toBeNull();
    expect(matchExercise('Abdominaux')).toBeNull();
  });

  it('reads per-set weights from notes when the count matches', () => {
    expect(setWeights([8, 8, 8, 8], 60, '30/40/50/60 kg (pyramide)')).toEqual([30, 40, 50, 60]);
    expect(setWeights([10, 10], 50, '50/40 kg')).toEqual([50, 40]);
    expect(setWeights([8, 8], 60, '30/40/50 kg')).toEqual([60, 60]); // count mismatch → chargeKg
    expect(setWeights([10, 10], 'léger', 'reprise, machines')).toEqual([0, 0]);
    expect(setWeights([5, 5], 20, '17,5/20 kg')).toEqual([17.5, 20]);
  });

  it('gives identical content the same key and a stable id', () => {
    const a = { date: '2026-09-26', mealType: 'snack' as const, foodName: 'Pomme', grams: 90 };
    expect(mealKey(a)).toBe(mealKey({ ...a, foodName: 'pomme' }));
    expect(stableHash(mealKey(a), 0)).toBe(stableHash(mealKey(a), 0));
    expect(stableHash(mealKey(a), 0)).not.toBe(stableHash(mealKey(a), 1)); // second apple ≠ first
    expect(stableHash('x')).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('export → import round trip', () => {
  const src: ExportSource = {
    profile: {
      displayName: 'A',
      email: 'a@b.c',
      language: 'en',
      goals: { ...DEFAULT_GOALS, kcalTraining: 3200 },
      met: DEFAULT_MET,
      reminders: DEFAULT_REMINDERS,
      bodyweightKg: 65.6,
      createdAt: 0,
      sex: 'male',
      age: 31,
    },
    foods: [{ id: 'f1', name: 'Pain tabouna', per100g: { kcal: 270, protein: 8.5, carbs: 54, fat: 2 }, favorite: true, source: 'user', createdAt: 0 }],
    meals: [
      { id: 'm1', date: '2026-09-21', loggedAt: 1, mealType: 'lunch', mealTypeLabel: 'Déjeuner', foodName: 'Pain tabouna', grams: 80, kcal: 216, protein: 6.8, carbs: 43.2, fat: 1.6, groupId: 'g' },
      { id: 'm2', date: '2026-09-22', loggedAt: 2, mealType: 'dinner', foodName: 'Pain tabouna', grams: 50, kcal: 135, protein: 4.3, carbs: 27, fat: 1, groupId: 'g2' },
    ],
    workouts: [
      {
        id: 'w1',
        date: '2026-09-24',
        startedAt: 1,
        intensity: 'moderate',
        caloriesBurned: 100,
        session: 'Jambes',
        exercises: [
          { exerciseId: 'Barbell_Squat', name: 'Squat', chargeKg: 60, sets: [{ kg: 30, reps: 8 }, { kg: 60, reps: 8 }], notes: '30/60 kg (pyramide)' },
          { exerciseId: 'Leg_Press', sets: [{ kg: 100, reps: 10 }, { kg: 120, reps: 8 }] }, // logged in the app
          { exerciseId: 'custom:dos-machine-1', name: 'Dos (machine) 1', chargeLabel: 'léger', sets: [{ kg: 0, reps: 10 }] },
        ],
      },
    ],
    weights: [{ id: 'x', date: '2026-09-21', kg: 65.6, bodyFat: 11.8, createdAt: 0 }],
  };

  it('produces a file the importer accepts, preserving labels, names and per-set weights', () => {
    const file = buildZidExport(src, '2026-09-27');
    const r = parseZidExport(JSON.stringify(file));
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    const d = r.data;
    expect(d.mealEntries.map((m) => m.mealType)).toEqual(['Déjeuner', 'Dinner']);
    expect(d.goals).toEqual({ kcal: 2900, protein: 145, carbs: 420, fat: 70, kcalTrainingDay: 3200 });
    expect(d.profile).toEqual({ sex: 'male', age: 31 });
    const [squat, press, dos] = d.workouts;
    expect(squat).toMatchObject({ exercise: 'Squat', chargeKg: 60, session: 'Jambes', notes: '30/60 kg (pyramide)' });
    expect(setWeights(squat.reps, squat.chargeKg, squat.notes)).toEqual([30, 60]);
    expect(press.exercise).toBe('Leg Press');
    expect(matchExercise(press.exercise)).toBe('Leg_Press');
    expect(setWeights(press.reps, press.chargeKg, press.notes)).toEqual([100, 120]); // breakdown written to notes
    expect(dos).toMatchObject({ exercise: 'Dos (machine) 1', chargeKg: 'léger' });
    expect(d.weightLogs).toEqual([{ date: '2026-09-21', weightKg: 65.6, bodyFatPct: 11.8 }]);
  });
});
