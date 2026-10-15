/**
 * All Firestore reads/writes live here so components never build paths by hand.
 * Layout: everything is under users/{uid}/… — see firestore.rules and README "Data model".
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from '@/features/auth/AuthProvider';
import { useLiveDoc, useLiveQuery } from './live';
import { SEED_FOODS } from '@/data/seedFoods';
import { DEFAULT_GOALS, DEFAULT_MET, DEFAULT_REMINDERS } from '@/lib/defaults';
import { uid as newId } from '@/lib/macros';
import type {
  CustomExercise,
  SavedMeal,
  WorkoutTemplate,
  DayLog,
  ExerciseRecord,
  Food,
  Lang,
  MealEntry,
  MealPhoto,
  UserProfile,
  WeightLog,
  WeeklySummary,
  Workout,
} from '@/types';

// ── Paths ────────────────────────────────────────────────────────────────────
export const ref = {
  user: (u: string) => doc(db, 'users', u),
  foods: (u: string) => collection(db, 'users', u, 'foods'),
  food: (u: string, id: string) => doc(db, 'users', u, 'foods', id),
  meals: (u: string) => collection(db, 'users', u, 'mealEntries'),
  meal: (u: string, id: string) => doc(db, 'users', u, 'mealEntries', id),
  photo: (u: string, id: string) => doc(db, 'users', u, 'mealPhotos', id),
  workouts: (u: string) => collection(db, 'users', u, 'workouts'),
  workout: (u: string, id: string) => doc(db, 'users', u, 'workouts', id),
  records: (u: string) => collection(db, 'users', u, 'exerciseRecords'),
  record: (u: string, id: string) => doc(db, 'users', u, 'exerciseRecords', id),
  weights: (u: string) => collection(db, 'users', u, 'weightLogs'),
  weight: (u: string, id: string) => doc(db, 'users', u, 'weightLogs', id),
  days: (u: string) => collection(db, 'users', u, 'days'),
  customExercises: (u: string) => collection(db, 'users', u, 'customExercises'),
  templates: (u: string) => collection(db, 'users', u, 'templates'),
  savedMeals: (u: string) => collection(db, 'users', u, 'savedMeals'),
  savedMeal: (u: string, id: string) => doc(db, 'users', u, 'savedMeals', id),
  template: (u: string, id: string) => doc(db, 'users', u, 'templates', id),
  customExercise: (u: string, id: string) => doc(db, 'users', u, 'customExercises', id),
  day: (u: string, date: string) => doc(db, 'users', u, 'days', date),
  summary: (u: string, weekStart: string) => doc(db, 'users', u, 'summaries', weekStart),
};

/** Firestore rejects `undefined` field values — strip them before writing. */
function clean<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

function withoutId<T extends { id: string }>(o: T): Omit<T, 'id'> {
  const { id: _id, ...rest } = o;
  return clean(rest);
}

// ── Profile ──────────────────────────────────────────────────────────────────

/** Create users/{uid} with defaults and seed My Foods on first sign-in. Idempotent. */
export async function ensureProfile(u: string, email: string, displayName: string, language: Lang) {
  const snap = await getDoc(ref.user(u));
  if (snap.exists()) return;

  const batch = writeBatch(db);
  const now = Date.now();
  const profile: UserProfile = {
    displayName,
    email,
    language,
    goals: DEFAULT_GOALS,
    met: DEFAULT_MET,
    reminders: DEFAULT_REMINDERS,
    bodyweightKg: null,
    createdAt: now,
  };
  batch.set(ref.user(u), profile);
  for (const s of SEED_FOODS) {
    const food: Omit<Food, 'id'> = { name: s.name, nameAr: s.nameAr, per100g: s.per100g, favorite: false, source: 'seed', createdAt: now };
    batch.set(ref.food(u, `seed-${s.key}`), food);
  }
  await batch.commit();
}

export function updateProfile(u: string, patch: Partial<UserProfile>) {
  return updateDoc(ref.user(u), patch);
}

// ── Foods ────────────────────────────────────────────────────────────────────

export function useFoods() {
  const { uid } = useAuth();
  return useLiveQuery<Food>(() => (uid ? query(ref.foods(uid), orderBy('name')) : null), `foods:${uid}`);
}

export async function saveFood(u: string, food: Omit<Food, 'id'> & { id?: string }) {
  const id = food.id ?? newId();
  await setDoc(ref.food(u, id), clean({ ...food, id: undefined }));
  return id;
}

export function toggleFavorite(u: string, id: string, favorite: boolean) {
  return updateDoc(ref.food(u, id), { favorite });
}

export function deleteFood(u: string, id: string) {
  return deleteDoc(ref.food(u, id));
}

export async function findFoodByBarcode(u: string, barcode: string): Promise<Food | null> {
  const snap = await getDocs(query(ref.foods(u), where('barcode', '==', barcode), limit(1)));
  const d = snap.docs[0];
  return d ? ({ id: d.id, ...d.data() } as Food) : null;
}

// ── Meals ────────────────────────────────────────────────────────────────────

export function useMealsOn(date: string) {
  const { uid } = useAuth();
  // Sorted client-side: equality + orderBy on another field would need a composite index.
  const res = useLiveQuery<MealEntry>(
    () => (uid ? query(ref.meals(uid), where('date', '==', date)) : null),
    `meals:${uid}:${date}`,
  );
  return { ...res, data: [...res.data].sort((a, b) => a.loggedAt - b.loggedAt) };
}

export function useMealsBetween(start: string, end: string) {
  const { uid } = useAuth();
  return useLiveQuery<MealEntry>(
    () => (uid ? query(ref.meals(uid), where('date', '>=', start), where('date', '<=', end), orderBy('date')) : null),
    `meals:${uid}:${start}:${end}`,
  );
}

/** Save a group of reviewed items (and optional thumbnail) atomically. */
export async function addMealEntries(u: string, entries: Omit<MealEntry, 'id'>[], thumb?: { id: string; date: string; dataUrl: string }) {
  const batch = writeBatch(db);
  if (thumb) {
    const photo: Omit<MealPhoto, 'id'> = { date: thumb.date, thumb: thumb.dataUrl };
    batch.set(ref.photo(u, thumb.id), photo);
  }
  for (const e of entries) batch.set(ref.meal(u, newId()), clean(e));
  bumpMealCount(batch, u, entries);
  await batch.commit();
}

export function updateMealEntry(u: string, id: string, patch: Partial<MealEntry>) {
  return updateDoc(ref.meal(u, id), clean(patch));
}

export async function deleteMealEntry(u: string, entry: Pick<MealEntry, 'id' | 'date'>) {
  const batch = writeBatch(db);
  batch.delete(ref.meal(u, entry.id));
  batch.set(ref.day(u, entry.date), { date: entry.date, mealCount: increment(-1) }, { merge: true });
  await batch.commit();
}

/** days/{date}.mealCount tracks how many entries a day has — cheap source for streaks. */
function bumpMealCount(batch: ReturnType<typeof writeBatch>, u: string, entries: Pick<MealEntry, 'date'>[]) {
  const perDay = new Map<string, number>();
  for (const e of entries) perDay.set(e.date, (perDay.get(e.date) ?? 0) + 1);
  for (const [date, n] of perDay) batch.set(ref.day(u, date), { date, mealCount: increment(n) }, { merge: true });
}

export async function getMealPhoto(u: string, id: string): Promise<string | null> {
  const snap = await getDoc(ref.photo(u, id));
  return snap.exists() ? (snap.data() as MealPhoto).thumb : null;
}

/** Copy entries to another day (used by "copy yesterday" / "duplicate meal"). */
export async function copyMealEntries(u: string, entries: MealEntry[], toDate: string) {
  const batch = writeBatch(db);
  const groupMap = new Map<string, string>();
  const now = Date.now();
  entries.forEach((e, i) => {
    if (!groupMap.has(e.groupId)) groupMap.set(e.groupId, newId());
    const { id: _id, photoId: _p, ...rest } = e;
    batch.set(ref.meal(u, newId()), clean({ ...rest, date: toDate, loggedAt: now + i, groupId: groupMap.get(e.groupId)! }));
  });
  bumpMealCount(batch, u, entries.map(() => ({ date: toDate })));
  await batch.commit();
}

// ── Day logs (water, training-day flag) ──────────────────────────────────────

export function useDayLog(date: string) {
  const { uid } = useAuth();
  return useLiveDoc<DayLog>(() => (uid ? ref.day(uid, date) : null), `day:${uid}:${date}`);
}

export function useDaysBetween(start: string, end: string) {
  const { uid } = useAuth();
  // Day docs use the date as their id; the `date` field mirrors it for range queries.
  return useLiveQuery<DayLog & { id: string; date: string }>(
    () => (uid ? query(ref.days(uid), where('date', '>=', start), where('date', '<=', end)) : null),
    `days:${uid}:${start}:${end}`,
  );
}

export function addWater(u: string, date: string, ml: number) {
  return setDoc(ref.day(u, date), { date, waterMl: increment(ml) }, { merge: true });
}

export function setWater(u: string, date: string, ml: number) {
  return setDoc(ref.day(u, date), { date, waterMl: Math.max(0, ml) }, { merge: true });
}

export function setTrainingDay(u: string, date: string, trainingDay: boolean) {
  return setDoc(ref.day(u, date), { date, trainingDay }, { merge: true });
}

// ── Workouts ─────────────────────────────────────────────────────────────────

export function useWorkoutsBetween(start: string, end: string) {
  const { uid } = useAuth();
  return useLiveQuery<Workout>(
    () => (uid ? query(ref.workouts(uid), where('date', '>=', start), where('date', '<=', end), orderBy('date', 'desc')) : null),
    `workouts:${uid}:${start}:${end}`,
  );
}

export function useRecentWorkouts(n = 20) {
  const { uid } = useAuth();
  return useLiveQuery<Workout>(
    () => (uid ? query(ref.workouts(uid), orderBy('startedAt', 'desc'), limit(n)) : null),
    `workouts-recent:${uid}:${n}`,
  );
}

/** Every workout, oldest first — for exercise history and weekly volume (a few hundred docs at most). */
export function useAllWorkouts() {
  const { uid } = useAuth();
  return useLiveQuery<Workout>(() => (uid ? query(ref.workouts(uid), orderBy('date')) : null), `workouts-all:${uid}`);
}

export function useExerciseRecords() {
  const { uid } = useAuth();
  return useLiveQuery<ExerciseRecord & { id: string }>(() => (uid ? ref.records(uid) : null), `records:${uid}`);
}

/** Save a workout and update per-exercise records in one batch. */
export async function saveWorkout(u: string, w: Workout, records: ExerciseRecord[]) {
  const batch = writeBatch(db);
  batch.set(ref.workout(u, w.id), withoutId(w));
  batch.set(ref.day(u, w.date), { date: w.date, trainingDay: true }, { merge: true });
  for (const r of records) batch.set(ref.record(u, r.exerciseId), r);
  await batch.commit();
}

export function deleteWorkout(u: string, id: string) {
  return deleteDoc(ref.workout(u, id));
}

// ── Custom exercises ───────────────────────────────────────────────────────

export function useCustomExercises() {
  const { uid } = useAuth();
  return useLiveQuery<CustomExercise>(() => (uid ? query(ref.customExercises(uid), orderBy('name')) : null), `custom-ex:${uid}`);
}

export function saveCustomExercise(u: string, ex: CustomExercise) {
  return setDoc(ref.customExercise(u, ex.id), withoutId(ex));
}

export function deleteCustomExercise(u: string, id: string) {
  return deleteDoc(ref.customExercise(u, id));
}

// ── Saved meals ────────────────────────────────────────────────────────────

export function useSavedMeals() {
  const { uid } = useAuth();
  return useLiveQuery<SavedMeal>(() => (uid ? query(ref.savedMeals(uid), orderBy('name')) : null), `saved-meals:${uid}`);
}

export function saveSavedMeal(u: string, meal: SavedMeal) {
  return setDoc(ref.savedMeal(u, meal.id), withoutId(meal));
}

export function deleteSavedMeal(u: string, id: string) {
  return deleteDoc(ref.savedMeal(u, id));
}

export function markSavedMealUsed(u: string, id: string) {
  return updateDoc(ref.savedMeal(u, id), { lastUsedAt: Date.now(), useCount: increment(1) });
}

// ── Workout templates ──────────────────────────────────────────────────────

export function useTemplates() {
  const { uid } = useAuth();
  return useLiveQuery<WorkoutTemplate>(() => (uid ? query(ref.templates(uid), orderBy('name')) : null), `templates:${uid}`);
}

export function saveTemplate(u: string, tpl: WorkoutTemplate) {
  return setDoc(ref.template(u, tpl.id), withoutId(tpl));
}

export function deleteTemplate(u: string, id: string) {
  return deleteDoc(ref.template(u, id));
}

export function markTemplateUsed(u: string, id: string) {
  return updateDoc(ref.template(u, id), { lastUsedAt: Date.now() });
}

// ── Weekly AI summaries ──────────────────────────────────────────────────

export function useWeeklySummary(weekStart: string) {
  const { uid } = useAuth();
  return useLiveDoc<WeeklySummary>(() => (uid ? ref.summary(uid, weekStart) : null), `summary:${uid}:${weekStart}`);
}

export function saveWeeklySummary(u: string, s: WeeklySummary) {
  return setDoc(ref.summary(u, s.weekStart), s);
}

// ── Bodyweight ───────────────────────────────────────────────────────────────

export function useWeightLogs() {
  const { uid } = useAuth();
  return useLiveQuery<WeightLog>(() => (uid ? query(ref.weights(uid), orderBy('date')) : null), `weights:${uid}`);
}

export async function saveWeightLog(u: string, log: Omit<WeightLog, 'id'>, isLatest: boolean) {
  const batch = writeBatch(db);
  batch.set(ref.weight(u, newId()), clean(log));
  if (isLatest) batch.update(ref.user(u), { bodyweightKg: log.kg });
  await batch.commit();
}

export function deleteWeightLog(u: string, id: string) {
  return deleteDoc(ref.weight(u, id));
}

// ── Export ───────────────────────────────────────────────────────────────────

export async function exportAll(u: string) {
  const [profile, foods, meals, workouts, weights, days] = await Promise.all([
    getDoc(ref.user(u)),
    getDocs(ref.foods(u)),
    getDocs(query(ref.meals(u), orderBy('date'))),
    getDocs(query(ref.workouts(u), orderBy('date'))),
    getDocs(query(ref.weights(u), orderBy('date'))),
    getDocs(ref.days(u)),
  ]);
  const rows = <T,>(s: typeof foods) => s.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
  return {
    profile: profile.data() as UserProfile,
    foods: rows<Food>(foods),
    meals: rows<MealEntry>(meals),
    workouts: rows<Workout>(workouts),
    weights: rows<WeightLog>(weights),
    days: rows<DayLog & { id: string }>(days),
  };
}
