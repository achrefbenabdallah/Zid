import { describe, expect, it } from 'vitest';
import { computeImportPlan, type ExistingData, type Op } from './dataImport';
import { buildZidExport, parseZidExport, type ZidData } from '@/lib/zidFormat';
import { DEFAULT_GOALS, DEFAULT_MET, DEFAULT_REMINDERS } from '@/lib/defaults';
import type { ExerciseRecord, Food, MealEntry, UserProfile, WeightLog, Workout } from '@/types';

/** Minimal in-memory stand-in for users/{uid}/** — applies ops exactly like runImport. */
class Store {
  docs = new Map<string, Record<string, unknown>>();
  apply(ops: (Op | null)[]) {
    for (const op of ops) {
      if (!op) continue;
      const key = op.path.join('/') || 'user';
      this.docs.set(key, op.merge ? { ...(this.docs.get(key) ?? {}), ...op.data } : { ...op.data });
    }
  }
  col<T>(name: string): T[] {
    return [...this.docs]
      .filter(([k]) => k.startsWith(name + '/'))
      .map(([k, v]) => ({ id: k.slice(name.length + 1), ...v }) as T);
  }
  existing(): ExistingData {
    return {
      foods: this.col<Food>('foods'),
      meals: this.col<MealEntry>('mealEntries'),
      workouts: this.col<Workout>('workouts'),
      weights: this.col<WeightLog>('weightLogs'),
      records: this.col<ExerciseRecord>('exerciseRecords'),
    };
  }
  count(name: string) {
    return this.col(name).length;
  }
}

const profile = (over: Partial<UserProfile> = {}): UserProfile => ({
  displayName: 'Test',
  email: 't@t.t',
  language: 'en',
  goals: DEFAULT_GOALS,
  met: DEFAULT_MET,
  reminders: DEFAULT_REMINDERS,
  bodyweightKg: null,
  createdAt: 0,
  ...over,
});

const file = {
  schemaVersion: 1,
  profile: { sex: 'male', age: 31, heightCm: 182, startWeightKg: 65.6, startBodyFatPct: 11.8 },
  goals: { kcal: 2900, protein: 145, carbs: 420, fat: 70, kcalTrainingDay: 3200 },
  foods: [
    { name: 'Pomme', per100g: { kcal: 52, protein: 0.3, carbs: 14, fat: 0.2 } },
    { name: 'Pain tabouna', per100g: { kcal: 270, protein: 8.5, carbs: 54, fat: 2 } },
    { name: 'Merguez (cuit)', per100g: { kcal: 300, protein: 16, carbs: 1, fat: 26 } },
  ],
  mealEntries: [
    { date: '2026-09-21', mealType: 'Déjeuner', foodName: 'Pain tabouna', grams: 80, kcal: 216, protein: 6.8, carbs: 43.2, fat: 1.6 },
    { date: '2026-09-26', mealType: 'Collation', foodName: 'Pomme', grams: 90, kcal: 47, protein: 0.3, carbs: 12.6, fat: 0.2 },
    { date: '2026-09-26', mealType: 'Collation', foodName: 'Pomme', grams: 90, kcal: 47, protein: 0.3, carbs: 12.6, fat: 0.2 },
    { date: '2026-09-26', mealType: 'Dîner (tacos)', foodName: 'Merguez (cuit)', grams: 120, kcal: 999, protein: 19.2, carbs: 1.2, fat: 31.2 },
  ],
  workouts: [
    { date: '2026-09-21', session: 'Circuit', exercise: 'Squat', chargeKg: 'léger', reps: [10, 10], notes: 'reprise, machines' },
    { date: '2026-09-21', session: 'Circuit', exercise: 'Dos (machine) 1', chargeKg: 'léger', reps: [10, 10], notes: 'reprise, machines' },
    { date: '2026-09-24', session: 'Jambes', exercise: 'Squat', chargeKg: 60, reps: [8, 8, 8, 8], notes: '30/40/50/60 kg (pyramide)' },
    { date: '2026-09-24', session: 'Jambes', exercise: 'Mollets 2', chargeKg: 50, reps: [10, 10], notes: '50/40 kg' },
  ],
  weightLogs: [{ date: '2026-09-21', weightKg: 65.6, bodyFatPct: 11.8, arm: null, chest: null, thigh: null, waist: null }],
};

const parsed = (f: unknown): ZidData => {
  const r = parseZidExport(JSON.stringify(f));
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.data;
};

describe('import into an empty account', () => {
  const store = new Store();
  const plan = computeImportPlan(parsed(file), profile(), store.existing());
  store.apply([...plan.ops, plan.goalsOp, plan.profileOp]);

  it('writes every record once, keeping identical rows as separate items', () => {
    expect(store.count('foods')).toBe(3);
    expect(store.count('mealEntries')).toBe(4); // two apples stay two entries
    expect(store.count('workouts')).toBe(2); // rows grouped per date
    expect(store.count('weightLogs')).toBe(1);
    expect(plan.summary).toMatchObject({
      foods: { created: 3, existing: 0 },
      meals: { created: 4, updated: 0, days: 2 },
      workouts: { rows: 4, days: 2, created: 4, updated: 0, alreadyPresent: 0 },
      weights: { created: 1, updated: 0 },
      unknownMealTypes: [],
    });
  });

  it('keeps the historical macros and labels as given', () => {
    const merguez = store.col<MealEntry>('mealEntries').find((m) => m.foodName === 'Merguez (cuit)')!;
    expect(merguez).toMatchObject({ kcal: 999, mealType: 'dinner', mealTypeLabel: 'Dîner (tacos)', grams: 120 });
  });

  it('builds sessions with names, notes, per-set weights and text weights', () => {
    const legs = store.col<Workout>('workouts').find((w) => w.date === '2026-09-24')!;
    expect(legs.session).toBe('Jambes');
    expect(legs.exercises[0]).toMatchObject({ exerciseId: 'Barbell_Squat', name: 'Squat', chargeKg: 60, notes: '30/40/50/60 kg (pyramide)' });
    expect(legs.exercises[0].sets.map((s) => s.kg)).toEqual([30, 40, 50, 60]);
    expect(legs.exercises[1]).toMatchObject({ exerciseId: 'custom:mollets-2', name: 'Mollets 2' });
    const circuit = store.col<Workout>('workouts').find((w) => w.date === '2026-09-21')!;
    expect(circuit.exercises[0]).toMatchObject({ chargeLabel: 'léger', sets: [{ kg: 0, reps: 10 }, { kg: 0, reps: 10 }] });
    expect(circuit.caloriesBurned).toBeGreaterThan(0);
  });

  it('updates streak counts, training days, records and the cached bodyweight', () => {
    expect(store.docs.get('days/2026-09-26')).toMatchObject({ mealCount: 3 });
    expect(store.docs.get('days/2026-09-24')).toMatchObject({ trainingDay: true });
    // "léger" sets have no usable weight → only the pyramid session feeds the squat record.
    expect(store.docs.get('exerciseRecords/Barbell_Squat')).toMatchObject({ bestKg: 60, lastDate: '2026-09-24' });
    expect(store.docs.get('user')).toMatchObject({ bodyweightKg: 65.6 });
  });

  it('suggests goals/profile only because they were never customised', () => {
    expect(plan.summary.goals).toMatchObject({ differs: true, suggested: true });
    expect(plan.summary.profile).toMatchObject({ differs: true, suggested: true });
    expect(store.docs.get('user')).toMatchObject({ goals: { ...DEFAULT_GOALS, kcalTraining: 3200 }, sex: 'male', heightCm: 182 });
  });
});

describe('re-importing the same file', () => {
  it('creates nothing new (idempotent) and reports updates', () => {
    const store = new Store();
    const first = computeImportPlan(parsed(file), profile(), store.existing());
    store.apply(first.ops);
    const before = new Map(store.docs);

    const second = computeImportPlan(parsed(file), profile({ bodyweightKg: 65.6 }), store.existing());
    store.apply(second.ops);

    expect(store.docs.size).toBe(before.size);
    expect(second.summary).toMatchObject({
      foods: { created: 0, existing: 3 },
      meals: { created: 0, updated: 4 },
      workouts: { created: 0, updated: 4, alreadyPresent: 0 },
      weights: { created: 0, updated: 1 },
    });
    expect(store.docs.get('days/2026-09-26')).toMatchObject({ mealCount: 3 }); // not inflated
  });

  it('keeps an existing food and does not overwrite it', () => {
    const store = new Store();
    store.apply([{ path: ['foods', 'mine'], data: { name: 'POMME', per100g: { kcal: 60, protein: 0, carbs: 15, fat: 0 } }, merge: false }]);
    const plan = computeImportPlan(parsed(file), profile(), store.existing());
    store.apply(plan.ops);
    expect(plan.summary.foods).toMatchObject({ created: 2, existing: 1 });
    expect(store.docs.get('foods/mine')).toMatchObject({ per100g: { kcal: 60 } });
    expect(store.col<MealEntry>('mealEntries').find((m) => m.foodName === 'Pomme')?.foodId).toBe('mine');
  });

  it('does not suggest replacing goals the user customised', () => {
    const plan = computeImportPlan(parsed(file), profile({ goals: { ...DEFAULT_GOALS, protein: 180 } }), new Store().existing());
    expect(plan.summary.goals).toMatchObject({ differs: true, suggested: false });
  });
});

describe('backup → restore of data logged in the app', () => {
  it('re-importing an export of the account adds nothing', () => {
    const store = new Store();
    // Data created in the app (random ids, English labels, library exercises).
    store.apply([
      { path: ['foods', 'seed-x'], data: { name: 'Chicken breast (cooked)', per100g: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 }, favorite: false, source: 'seed', createdAt: 0 }, merge: false },
      { path: ['mealEntries', 'r1'], data: { date: '2026-09-25', loggedAt: 5, mealType: 'lunch', foodName: 'Chicken breast (cooked)', grams: 200, kcal: 330, protein: 62, carbs: 0, fat: 7.2, groupId: 'g' }, merge: false },
      { path: ['mealEntries', 'r2'], data: { date: '2026-09-25', loggedAt: 6, mealType: 'lunch', foodName: 'Chicken breast (cooked)', grams: 200, kcal: 330, protein: 62, carbs: 0, fat: 7.2, groupId: 'g' }, merge: false },
      {
        path: ['workouts', 'w1'],
        data: { date: '2026-09-25', startedAt: 1, intensity: 'hard', caloriesBurned: 200, exercises: [{ exerciseId: 'Leg_Press', sets: [{ kg: 100, reps: 10 }, { kg: 120, reps: 8 }] }] },
        merge: false,
      },
      { path: ['weightLogs', 'wl'], data: { date: '2026-09-25', kg: 66, waist: 80, createdAt: 0 }, merge: false },
      { path: ['days', '2026-09-25'], data: { date: '2026-09-25', mealCount: 2 }, merge: false },
    ]);
    const before = store.docs.size;
    const exported = buildZidExport(
      {
        profile: profile(),
        foods: store.col<Food>('foods'),
        meals: store.col<MealEntry>('mealEntries'),
        workouts: store.col<Workout>('workouts'),
        weights: store.col<WeightLog>('weightLogs'),
      },
      '2026-09-27',
    );
    const plan = computeImportPlan(parsed(exported), profile(), store.existing());
    store.apply(plan.ops);

    // Records are derived data; 'user' is the profile doc (it always exists in a real account —
    // here the import just sets its cached bodyweight to the restored 66 kg).
    const dataDocs = [...store.docs.keys()].filter((k) => !k.startsWith('exerciseRecords/') && k !== 'user');
    expect(dataDocs.length).toBe(before);
    expect(store.docs.get('user')).toEqual({ bodyweightKg: 66 });
    expect(plan.summary).toMatchObject({
      foods: { created: 0 },
      meals: { created: 0, updated: 2 },
      workouts: { created: 0, alreadyPresent: 1 },
      weights: { created: 0, updated: 1 },
    });
    expect(store.docs.get('weightLogs/wl')).toMatchObject({ kg: 66, waist: 80 }); // measurement not wiped
    expect(store.docs.get('days/2026-09-25')).toMatchObject({ mealCount: 2 });
  });
});
