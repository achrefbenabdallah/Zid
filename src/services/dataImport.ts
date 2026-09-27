/**
 * Import / export of the Zid data file (see lib/zidFormat.ts for the format).
 *
 * Import is two-step so nothing is written before the user confirms:
 *   1. planImport()  — reads the user's existing data and computes every write + a summary.
 *   2. runImport()   — commits the writes in batches of ≤400 with progress.
 *
 * No duplicates: each record is matched against existing data by content (a meal by
 * date + meal type + food + grams, a weight log by date, a workout exercise by name + sets,
 * a food by name) and otherwise written under a deterministic id — so importing the same
 * file twice, or re-importing an export of the app's own data, updates instead of duplicating.
 */
import { doc, getDoc, getDocs, getDocsFromServer, orderBy, query, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { ref } from './data';
import { estimateWorkoutCalories } from './calories';
import { DEFAULT_GOALS } from '@/lib/defaults';
import { fromDateKey, toDateKey } from '@/lib/dates';
import { mergeRecord } from '@/lib/records';
import {
  buildZidExport,
  customExerciseId,
  exerciseDisplayName,
  exerciseSig,
  mapMealType,
  matchExercise,
  mealKey,
  norm,
  setWeights,
  stableHash,
  type ZidData,
  type ZidGoals,
  type ZidProfile,
} from '@/lib/zidFormat';
import type { ExerciseRecord, Food, Goals, MealEntry, UserProfile, WeightLog, Workout, WorkoutExercise } from '@/types';

export interface Op {
  /** Document path under users/{uid}; [] is the user document itself. */
  path: string[];
  data: Record<string, unknown>;
  /** merge: update fields on an existing doc; set: write the whole doc. */
  merge: boolean;
}

export interface ImportSummary {
  foods: { total: number; created: number; existing: number };
  meals: { total: number; created: number; updated: number; days: number };
  workouts: { rows: number; days: number; created: number; updated: number; alreadyPresent: number };
  weights: { total: number; created: number; updated: number };
  unknownMealTypes: string[];
  customExercises: string[];
  matchedExercises: number;
  goals: { file: Goals; current: Goals; differs: boolean; suggested: boolean } | null;
  profile: { file: ZidProfile; current: ZidProfile; differs: boolean; suggested: boolean } | null;
}

export interface ExistingData {
  foods: Food[];
  meals: MealEntry[];
  workouts: Workout[];
  weights: WeightLog[];
  records: ExerciseRecord[];
}

export interface ImportPlan {
  uid: string;
  ops: Op[];
  goalsOp: Op | null;
  profileOp: Op | null;
  summary: ImportSummary;
}

const clean = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
const noon = (date: string, offsetMs = 0) => fromDateKey(date).getTime() + 12 * 3600_000 + offsetMs;

export async function planImport(uid: string, data: ZidData, profile: UserProfile): Promise<ImportPlan> {
  const dates = [...data.mealEntries, ...data.workouts, ...data.weightLogs].map((r) => r.date).sort();
  const [minDate, maxDate] = [dates[0] ?? '0000-00-00', dates[dates.length - 1] ?? '0000-00-00'];

  const rows = <T>(snap: Awaited<ReturnType<typeof getDocs>>) => snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as T);
  // Read from the server, never the offline cache: a partial cache could hide existing
  // records and cause duplicates. (The UI requires a connection before planning.)
  const [foodsSnap, mealsSnap, workoutsSnap, weightsSnap, recordsSnap] = await Promise.all([
    getDocsFromServer(ref.foods(uid)),
    getDocsFromServer(query(ref.meals(uid), where('date', '>=', minDate), where('date', '<=', maxDate))),
    getDocsFromServer(query(ref.workouts(uid), where('date', '>=', minDate), where('date', '<=', maxDate))),
    getDocsFromServer(query(ref.weights(uid), orderBy('date'))),
    getDocsFromServer(ref.records(uid)),
  ]);
  const existing: ExistingData = {
    foods: rows<Food>(foodsSnap),
    meals: rows<MealEntry>(mealsSnap),
    workouts: rows<Workout>(workoutsSnap),
    weights: rows<WeightLog>(weightsSnap),
    records: rows<ExerciseRecord>(recordsSnap),
  };
  return { uid, ...computeImportPlan(data, profile, existing) };
}

/**
 * Pure planner: given the file and the user's current data, compute every write.
 * `existing.meals` / `existing.workouts` must cover at least the file's date range.
 */
export function computeImportPlan(data: ZidData, profile: UserProfile, existing: ExistingData): Omit<ImportPlan, 'uid'> {
  const existingFoods = existing.foods;
  const existingMeals = existing.meals;
  const existingWorkouts = existing.workouts;
  const existingWeights = [...existing.weights].sort((a, b) => a.date.localeCompare(b.date));
  const records = new Map(existing.records.map((r) => [r.exerciseId, r]));

  const ops: Op[] = [];
  const s: ImportSummary = {
    foods: { total: data.foods.length, created: 0, existing: 0 },
    meals: { total: data.mealEntries.length, created: 0, updated: 0, days: 0 },
    workouts: { rows: data.workouts.length, days: 0, created: 0, updated: 0, alreadyPresent: 0 },
    weights: { total: data.weightLogs.length, created: 0, updated: 0 },
    unknownMealTypes: [],
    customExercises: [],
    matchedExercises: 0,
    goals: null,
    profile: null,
  };

  // ── Foods: merge by name, keep existing ──
  const foodIdByName = new Map<string, string>();
  for (const f of existingFoods) {
    foodIdByName.set(norm(f.name), f.id);
    if (f.nameAr) foodIdByName.set(norm(f.nameAr), f.id);
  }
  for (const f of data.foods) {
    const key = norm(f.name);
    if (foodIdByName.has(key)) {
      s.foods.existing++;
      continue;
    }
    const id = `imp-food-${stableHash(key)}`;
    foodIdByName.set(key, id);
    const food: Omit<Food, 'id'> = { name: f.name, per100g: f.per100g, favorite: false, source: 'user', createdAt: Date.now() };
    ops.push({ path: ['foods', id], data: food as unknown as Record<string, unknown>, merge: false });
    s.foods.created++;
  }

  // ── Meals: match existing by content, preserve the file's macros ──
  const existingByKey = new Map<string, MealEntry[]>();
  for (const m of [...existingMeals].sort((a, b) => a.loggedAt - b.loggedAt)) {
    const k = mealKey(m);
    existingByKey.set(k, [...(existingByKey.get(k) ?? []), m]);
  }
  const unknownLabels = new Set<string>();
  const seen = new Map<string, number>();
  const idsByDate = new Map<string, Set<string>>();
  for (const m of existingMeals) idsByDate.set(m.date, (idsByDate.get(m.date) ?? new Set()).add(m.id));

  data.mealEntries.forEach((row, i) => {
    const { type, known } = mapMealType(row.mealType);
    if (!known) unknownLabels.add(row.mealType);
    const k = mealKey({ date: row.date, mealType: type, foodName: row.foodName, grams: row.grams });
    const n = seen.get(k) ?? 0; // identical rows (e.g. two apples) are separate items
    seen.set(k, n + 1);
    const macros = { kcal: row.kcal, protein: row.protein, carbs: row.carbs, fat: row.fat };
    const existing = existingByKey.get(k)?.[n];
    if (existing) {
      ops.push({ path: ['mealEntries', existing.id], data: { ...macros, mealTypeLabel: row.mealType }, merge: true });
      s.meals.updated++;
      return;
    }
    const id = `imp-meal-${stableHash(k, n)}`;
    const entry: Omit<MealEntry, 'id'> = {
      date: row.date,
      loggedAt: noon(row.date, i),
      mealType: type,
      mealTypeLabel: row.mealType,
      foodName: row.foodName,
      foodId: foodIdByName.get(norm(row.foodName)),
      grams: row.grams,
      ...macros,
      groupId: `imp-${stableHash(row.date, row.mealType)}`,
    };
    ops.push({ path: ['mealEntries', id], data: clean(entry as unknown as Record<string, unknown>), merge: false });
    idsByDate.set(row.date, (idsByDate.get(row.date) ?? new Set()).add(id));
    s.meals.created++;
  });
  s.unknownMealTypes = [...unknownLabels];
  // Day meal counts (streaks) are set absolutely, so re-imports can't inflate them.
  const mealDates = [...new Set(data.mealEntries.map((m) => m.date))];
  s.meals.days = mealDates.length;
  for (const date of mealDates) ops.push({ path: ['days', date], data: { date, mealCount: idsByDate.get(date)?.size ?? 0 }, merge: true });

  // ── Weight logs: one per date ──
  const weightByDate = new Map(existingWeights.map((w) => [w.date, w]));
  const lastRowPerDate = new Map(data.weightLogs.map((w) => [w.date, w]));
  for (const [date, w] of lastRowPerDate) {
    const existing = weightByDate.get(date);
    const log = clean({
      date,
      kg: w.weightKg,
      bodyFat: w.bodyFatPct,
      arm: w.arm,
      chest: w.chest,
      thigh: w.thigh,
      waist: w.waist,
      createdAt: existing?.createdAt ?? noon(date),
    });
    // Merge: a re-import updates the weight without wiping measurements added in the app.
    ops.push({ path: ['weightLogs', existing ? existing.id : `imp-wt-${stableHash(date)}`], data: log, merge: true });
    if (existing) s.weights.updated++;
    else s.weights.created++;
  }
  // Keep the cached bodyweight (used for calorie estimates) at the newest weigh-in.
  const allWeights = [...existingWeights.filter((w) => !lastRowPerDate.has(w.date)).map((w) => ({ date: w.date, kg: w.kg })), ...[...lastRowPerDate.values()].map((w) => ({ date: w.date, kg: w.weightKg }))].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const newest = allWeights[allWeights.length - 1];
  if (newest && lastRowPerDate.has(newest.date) && newest.kg !== profile.bodyweightKg) {
    ops.push({ path: [], data: { bodyweightKg: newest.kg }, merge: true });
  }
  const weightOn = (date: string) => [...allWeights].reverse().find((w) => w.date <= date)?.kg ?? profile.bodyweightKg;

  // ── Workouts: rows grouped by date → one session per day ──
  const byDate = new Map<string, typeof data.workouts>();
  for (const w of data.workouts) byDate.set(w.date, [...(byDate.get(w.date) ?? []), w]);
  s.workouts.days = byDate.size;
  const customNames = new Set<string>();
  const recordRows: { date: string; ex: WorkoutExercise }[] = [];

  for (const [date, dayRows] of [...byDate].sort(([a], [b]) => a.localeCompare(b))) {
    const id = `imp-wk-${stableHash(date)}`;
    // Exercises already saved in *other* workouts that day (e.g. logged in the app, or a
    // previous export) are skipped so a backup→restore never doubles them.
    const otherSigs = new Set(
      existingWorkouts
        .filter((w) => w.date === date && w.id !== id)
        .flatMap((w) => w.exercises.map((e) => exerciseSig(exerciseDisplayName(e), e.sets))),
    );
    const exercises: WorkoutExercise[] = [];
    for (const row of dayRows) {
      const kgs = setWeights(row.reps, row.chargeKg, row.notes);
      const sets = row.reps.map((reps, i) => ({ kg: kgs[i], reps }));
      if (otherSigs.has(exerciseSig(row.exercise, sets))) {
        s.workouts.alreadyPresent++;
        continue;
      }
      const libraryId = matchExercise(row.exercise);
      if (libraryId) s.matchedExercises++;
      else customNames.add(row.exercise);
      const ex: WorkoutExercise = {
        exerciseId: libraryId ?? customExerciseId(row.exercise),
        name: row.exercise,
        sets,
        ...(typeof row.chargeKg === 'number' ? { chargeKg: row.chargeKg } : {}),
        ...(typeof row.chargeKg === 'string' ? { chargeLabel: row.chargeKg } : {}),
        ...(row.notes ? { notes: row.notes } : {}),
      };
      exercises.push(ex);
      // Only real weights feed "last time"/PRs (a "léger" set has no usable kg).
      if (libraryId && sets.some((st) => st.kg > 0)) recordRows.push({ date, ex });
    }
    if (!exercises.length) continue;
    const sessions = [...new Set(dayRows.map((r) => r.session).filter(Boolean))];
    const setCount = exercises.reduce((n, e) => n + e.sets.length, 0);
    const workout: Omit<Workout, 'id'> = {
      date,
      startedAt: noon(date),
      exercises,
      intensity: 'moderate',
      caloriesBurned: estimateWorkoutCalories(setCount, weightOn(date), 'moderate', profile.met),
      ...(sessions.length ? { session: sessions.join(' + ') } : {}),
    };
    ops.push({ path: ['workouts', id], data: workout as unknown as Record<string, unknown>, merge: false });
    ops.push({ path: ['days', date], data: { date, trainingDay: true }, merge: true });
    if (existingWorkouts.some((w) => w.id === id)) s.workouts.updated += exercises.length;
    else s.workouts.created += exercises.length;
  }
  s.customExercises = [...customNames];

  // Exercise records ("last time" + best), merged chronologically; merging is idempotent.
  const touched = new Set<string>();
  for (const { date, ex } of recordRows) {
    records.set(ex.exerciseId, mergeRecord(ex.exerciseId, date, ex.sets, records.get(ex.exerciseId)));
    touched.add(ex.exerciseId);
  }
  for (const idx of touched) ops.push({ path: ['exerciseRecords', idx], data: records.get(idx) as unknown as Record<string, unknown>, merge: false });

  // ── Goals & profile: only applied if the user ticks them in the preview ──
  let goalsOp: Op | null = null;
  const fg: ZidGoals = data.goals;
  if (Object.keys(fg).length) {
    const cur = profile.goals;
    const next: Goals = {
      ...cur,
      kcal: fg.kcal ?? cur.kcal,
      protein: fg.protein ?? cur.protein,
      carbs: fg.carbs ?? cur.carbs,
      fat: fg.fat ?? cur.fat,
      kcalTraining: fg.kcalTrainingDay ?? cur.kcalTraining,
    };
    const differs = JSON.stringify(next) !== JSON.stringify(cur);
    // Suggest applying only when the user never customised their goals.
    s.goals = { file: next, current: cur, differs, suggested: differs && JSON.stringify(cur) === JSON.stringify(DEFAULT_GOALS) };
    if (differs) goalsOp = { path: [], data: { goals: next }, merge: true };
  }
  let profileOp: Op | null = null;
  const fp = data.profile;
  if (Object.keys(fp).length) {
    const current: ZidProfile = clean({ sex: profile.sex, age: profile.age, heightCm: profile.heightCm, startWeightKg: profile.startWeightKg, startBodyFatPct: profile.startBodyFatPct });
    const differs = (Object.keys(fp) as (keyof ZidProfile)[]).some((k) => fp[k] !== current[k]);
    s.profile = { file: fp, current, differs, suggested: differs && Object.keys(current).length === 0 };
    if (differs) profileOp = { path: [], data: { ...fp }, merge: true };
  }

  return { ops, goalsOp, profileOp, summary: s };
}

export const BATCH_SIZE = 400;

/** Commit the plan in batches of ≤400 writes. Returns the number of documents written. */
export async function runImport(
  plan: ImportPlan,
  options: { applyGoals: boolean; applyProfile: boolean },
  onProgress: (done: number, total: number) => void,
): Promise<number> {
  const ops = [...plan.ops];
  if (options.applyGoals && plan.goalsOp) ops.push(plan.goalsOp);
  if (options.applyProfile && plan.profileOp) ops.push(plan.profileOp);
  onProgress(0, ops.length);
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    for (const op of ops.slice(i, i + BATCH_SIZE)) {
      const target = doc(db, 'users', plan.uid, ...op.path);
      if (op.merge) batch.set(target, op.data, { merge: true });
      else batch.set(target, op.data);
    }
    await batch.commit();
    onProgress(Math.min(i + BATCH_SIZE, ops.length), ops.length);
  }
  return ops.length;
}

/** Export everything in the importable format (backup / restore / round-trip). */
export async function exportZidFile(uid: string) {
  const [profileSnap, foods, meals, workouts, weights] = await Promise.all([
    getDoc(doc(db, 'users', uid)),
    getDocs(ref.foods(uid)),
    getDocs(query(ref.meals(uid), orderBy('date'))),
    getDocs(query(ref.workouts(uid), orderBy('date'))),
    getDocs(query(ref.weights(uid), orderBy('date'))),
  ]);
  const list = <T>(snap: typeof foods) => snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
  return buildZidExport(
    {
      profile: profileSnap.data() as UserProfile,
      foods: list<Food>(foods),
      meals: list<MealEntry>(meals),
      workouts: list<Workout>(workouts),
      weights: list<WeightLog>(weights),
    },
    toDateKey(),
  );
}
