/**
 * The Zid portable data format (schemaVersion 1) — used by Settings → Import / Export.
 *
 *   { schemaVersion: 1, app: "Zid", exportedAt, profile, goals,
 *     foods[], mealEntries[], workouts[] (one row per exercise), weightLogs[] }
 *
 * This module is pure (no Firestore): validation, normalisation, mapping to the app model,
 * deterministic ids, and building an export. See services/dataImport.ts for the writes.
 */
import { EXERCISES, getExercise } from '@/data/exercises';
import { EXERCISE_ALIASES } from '@/data/exerciseAliases';
import type { Food, Goals, Macros, MealEntry, MealType, UserProfile, WeightLog, Workout, WorkoutSet } from '@/types';

// ── File shape ───────────────────────────────────────────────────────────────

export interface ZidFoodRow {
  name: string;
  per100g: Macros;
}
export interface ZidMealRow extends Macros {
  date: string;
  mealType: string;
  foodName: string;
  grams: number;
}
export interface ZidWorkoutRow {
  date: string;
  session?: string;
  exercise: string;
  /** Number, or a text label such as "léger" (kept verbatim). */
  chargeKg?: number | string;
  reps: number[];
  notes?: string;
}
export interface ZidWeightRow {
  date: string;
  weightKg: number;
  bodyFatPct?: number;
  arm?: number;
  chest?: number;
  thigh?: number;
  waist?: number;
}
export interface ZidProfile {
  sex?: 'male' | 'female';
  age?: number;
  heightCm?: number;
  startWeightKg?: number;
  startBodyFatPct?: number;
}
export interface ZidGoals {
  kcal?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  kcalTrainingDay?: number;
}
export interface ZidData {
  schemaVersion: 1;
  app: string;
  exportedAt: string;
  profile: ZidProfile;
  goals: ZidGoals;
  foods: ZidFoodRow[];
  mealEntries: ZidMealRow[];
  workouts: ZidWorkoutRow[];
  weightLogs: ZidWeightRow[];
}

// ── Validation ───────────────────────────────────────────────────────────────

export type ZidErrorCode =
  | 'invalidJson'
  | 'notObject'
  | 'schemaVersion'
  | 'notArray'
  | 'rowNotObject'
  | 'required'
  | 'notNumber'
  | 'negative'
  | 'notString'
  | 'badDate'
  | 'tooLong'
  | 'emptyReps';

export interface ZidError {
  path: string;
  code: ZidErrorCode;
  /** The offending value, shortened for display. */
  got?: string;
}

export type ParseResult = { ok: true; data: ZidData } | { ok: false; errors: ZidError[] };

const MAX_ERRORS = 25;
const MAX_TEXT = 120;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const show = (v: unknown) => {
  const s = JSON.stringify(v);
  return s === undefined ? String(v) : s.length > 40 ? s.slice(0, 37) + '…' : s;
};

export function isValidDate(s: string): boolean {
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]);
}

/** Accepts JSON text or an already-parsed value. Never throws. */
export function parseZidExport(input: string | unknown): ParseResult {
  let raw: unknown = input;
  if (typeof input === 'string') {
    try {
      raw = JSON.parse(input.replace(/^﻿/, ''));
    } catch {
      return { ok: false, errors: [{ path: '', code: 'invalidJson' }] };
    }
  }
  const errors: ZidError[] = [];
  const err = (path: string, code: ZidErrorCode, got?: unknown) => {
    if (errors.length < MAX_ERRORS) errors.push({ path, code, got: got === undefined ? undefined : show(got) });
  };

  if (!isObj(raw)) return { ok: false, errors: [{ path: '', code: 'notObject' }] };
  if (raw.schemaVersion !== 1) return { ok: false, errors: [{ path: 'schemaVersion', code: 'schemaVersion', got: show(raw.schemaVersion) }] };

  // Field readers. `null`/missing numbers are "absent" unless required.
  const num = (o: Record<string, unknown>, k: string, path: string, required: boolean): number | undefined => {
    const v = o[k];
    if (v === undefined || v === null) {
      if (required) err(`${path}.${k}`, 'required');
      return undefined;
    }
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      err(`${path}.${k}`, 'notNumber', v);
      return undefined;
    }
    if (v < 0) {
      err(`${path}.${k}`, 'negative', v);
      return undefined;
    }
    return v;
  };
  const str = (o: Record<string, unknown>, k: string, path: string, required: boolean, max = MAX_TEXT): string | undefined => {
    const v = o[k];
    if (v === undefined || v === null || (typeof v === 'string' && !v.trim())) {
      if (required) err(`${path}.${k}`, 'required');
      return undefined;
    }
    if (typeof v !== 'string') {
      err(`${path}.${k}`, 'notString', v);
      return undefined;
    }
    if (v.trim().length > max) {
      err(`${path}.${k}`, 'tooLong', v);
      return undefined;
    }
    return v.trim();
  };
  const date = (o: Record<string, unknown>, path: string): string | undefined => {
    const v = str(o, 'date', path, true, 10);
    if (v !== undefined && !isValidDate(v)) {
      err(`${path}.date`, 'badDate', v);
      return undefined;
    }
    return v;
  };
  const rows = (k: string): Record<string, unknown>[] => {
    const v = raw[k];
    if (v === undefined || v === null) return [];
    if (!Array.isArray(v)) {
      err(k, 'notArray', typeof v);
      return [];
    }
    return v.filter((row, i) => (isObj(row) ? true : (err(`${k}[${i}]`, 'rowNotObject', row), false)));
  };

  const foods: ZidFoodRow[] = [];
  rows('foods').forEach((o, i) => {
    const p = `foods[${i}]`;
    const name = str(o, 'name', p, true);
    const m = o.per100g;
    if (!isObj(m)) return err(`${p}.per100g`, m === undefined || m === null ? 'required' : 'rowNotObject', m);
    const kcal = num(m, 'kcal', `${p}.per100g`, true);
    // Missing per-100g macros are treated as 0 g (a food with no fat listed has no fat).
    const protein = num(m, 'protein', `${p}.per100g`, false) ?? 0;
    const carbs = num(m, 'carbs', `${p}.per100g`, false) ?? 0;
    const fat = num(m, 'fat', `${p}.per100g`, false) ?? 0;
    if (name !== undefined && kcal !== undefined) foods.push({ name, per100g: { kcal, protein, carbs, fat } });
  });

  const mealEntries: ZidMealRow[] = [];
  rows('mealEntries').forEach((o, i) => {
    const p = `mealEntries[${i}]`;
    const row = {
      date: date(o, p),
      mealType: str(o, 'mealType', p, true, 60),
      foodName: str(o, 'foodName', p, true),
      grams: num(o, 'grams', p, true),
      kcal: num(o, 'kcal', p, true),
      protein: num(o, 'protein', p, true),
      carbs: num(o, 'carbs', p, true),
      fat: num(o, 'fat', p, true),
    };
    if (Object.values(row).every((v) => v !== undefined)) mealEntries.push(row as ZidMealRow);
  });

  const workouts: ZidWorkoutRow[] = [];
  rows('workouts').forEach((o, i) => {
    const p = `workouts[${i}]`;
    const d = date(o, p);
    const exercise = str(o, 'exercise', p, true);
    const session = str(o, 'session', p, false, 60);
    const notes = str(o, 'notes', p, false, 500);
    // chargeKg: number, numeric text ("60", "62,5"), or a label like "léger".
    let chargeKg: number | string | undefined;
    const c = o.chargeKg;
    if (typeof c === 'number') {
      if (!Number.isFinite(c) || c < 0) err(`${p}.chargeKg`, c < 0 ? 'negative' : 'notNumber', c);
      else chargeKg = c;
    } else if (typeof c === 'string' && c.trim()) {
      const n = Number(c.trim().replace(',', '.'));
      chargeKg = Number.isFinite(n) && n >= 0 && /\d/.test(c) ? n : c.trim().slice(0, 40);
    } else if (c !== undefined && c !== null && c !== '') {
      err(`${p}.chargeKg`, 'notNumber', c);
    }
    let reps: number[] | undefined;
    if (!Array.isArray(o.reps)) err(`${p}.reps`, o.reps === undefined || o.reps === null ? 'required' : 'notArray', o.reps);
    else if (o.reps.length === 0) err(`${p}.reps`, 'emptyReps');
    else if (o.reps.some((r) => typeof r !== 'number' || !Number.isFinite(r) || r < 0)) err(`${p}.reps`, 'notNumber', o.reps);
    else reps = (o.reps as number[]).map((r) => Math.round(r));
    if (d && exercise && reps) workouts.push({ date: d, exercise, reps, session, notes, chargeKg });
  });

  const weightLogs: ZidWeightRow[] = [];
  rows('weightLogs').forEach((o, i) => {
    const p = `weightLogs[${i}]`;
    const d = date(o, p);
    const weightKg = num(o, 'weightKg', p, true);
    const row: ZidWeightRow = { date: d!, weightKg: weightKg! };
    for (const k of ['bodyFatPct', 'arm', 'chest', 'thigh', 'waist'] as const) {
      const v = num(o, k, p, false);
      if (v !== undefined) row[k] = v;
    }
    if (d && weightKg !== undefined) weightLogs.push(row);
  });

  const profile: ZidProfile = {};
  if (isObj(raw.profile)) {
    const o = raw.profile;
    if (o.sex === 'male' || o.sex === 'female') profile.sex = o.sex;
    for (const k of ['age', 'heightCm', 'startWeightKg', 'startBodyFatPct'] as const) {
      const v = num(o, k, 'profile', false);
      if (v !== undefined) profile[k] = v;
    }
  } else if (raw.profile !== undefined && raw.profile !== null) err('profile', 'rowNotObject', raw.profile);

  const goals: ZidGoals = {};
  if (isObj(raw.goals)) {
    for (const k of ['kcal', 'protein', 'carbs', 'fat', 'kcalTrainingDay'] as const) {
      const v = num(raw.goals, k, 'goals', false);
      if (v !== undefined) goals[k] = v;
    }
  } else if (raw.goals !== undefined && raw.goals !== null) err('goals', 'rowNotObject', raw.goals);

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      schemaVersion: 1,
      app: typeof raw.app === 'string' ? raw.app : 'Zid',
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
      profile,
      goals,
      foods,
      mealEntries,
      workouts,
      weightLogs,
    },
  };
}

// ── Normalisation & mapping ──────────────────────────────────────────────────

/** Lower-case, strip accents/diacritics and punctuation — for matching names across languages. */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ًͯ-ٰٟـ]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const MEAL_TYPE_WORDS: [MealType, string[]][] = [
  ['breakfast', ['breakfast', 'petit dejeuner', 'petit dej', 'ptit dej', 'pdj', 'فطور', 'فطور الصباح']],
  ['lunch', ['lunch', 'dejeuner', 'dej', 'غداء', 'غدا']],
  ['dinner', ['dinner', 'diner', 'souper', 'عشاء', 'عشا']],
  ['snack', ['snack', 'collation', 'gouter', 'en cas', 'encas', 'لمجة']],
  ['preWorkout', ['preworkout', 'pre workout', 'pre training', 'avant seance', 'avant entrainement', 'pre entrainement', 'قبل التمرين']],
  ['postWorkout', ['postworkout', 'post workout', 'post training', 'apres seance', 'apres entrainement', 'post entrainement', 'بعد التمرين']],
];

/** "Dîner (tacos)" → dinner, "Avant séance" → preWorkout. Unknown labels → snack (label kept). */
export function mapMealType(label: string): { type: MealType; known: boolean } {
  const n = norm(label.replace(/\(.*?\)/g, ''));
  for (const [type, words] of MEAL_TYPE_WORDS) {
    if (type.toLowerCase() === n.replace(/ /g, '') || words.some((w) => norm(w) === n)) return { type, known: true };
  }
  return { type: 'snack', known: false };
}

const LIBRARY_BY_NAME = new Map(EXERCISES.map((e) => [norm(e.name), e.id]));

/**
 * Free-text exercise name → library id, or null (imported as a custom exercise).
 * Numbered names ("Mollets 1", "Dos (machine) 2") are distinct machines/variants, so they
 * stay custom rather than being merged into one library exercise.
 */
export function matchExercise(name: string): string | null {
  if (/\s\d+$/.test(name.trim())) return null;
  const full = norm(name);
  const outer = norm(name.replace(/\(.*?\)/g, ''));
  const inner = [...name.matchAll(/\((.*?)\)/g)].map((m) => norm(m[1]));
  for (const c of [full, outer, ...inner]) {
    if (!c) continue;
    const hit = LIBRARY_BY_NAME.get(c) ?? EXERCISE_ALIASES[c];
    if (hit && getExercise(hit)) return hit;
  }
  return null;
}

export const customExerciseId = (name: string) => `custom:${norm(name).replace(/ /g, '-').slice(0, 80) || 'exercise'}`;

/**
 * Per-set weights. Notes like "30/40/50/60 kg (pyramide)" give one weight per set when the
 * count matches `reps`; otherwise every set uses chargeKg (0 if unknown, e.g. "léger").
 */
export function setWeights(reps: number[], chargeKg: number | string | undefined, notes?: string): number[] {
  if (notes) {
    for (const m of notes.matchAll(/(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)+)\s*kg/gi)) {
      const kgs = m[1].split('/').map((x) => Number(x.trim().replace(',', '.')));
      if (kgs.length === reps.length && kgs.every(Number.isFinite)) return kgs;
    }
  }
  const kg = typeof chargeKg === 'number' ? chargeKg : 0;
  return reps.map(() => kg);
}

/** 64-bit FNV-1a → 16 hex chars. Deterministic ids so re-imports upsert instead of duplicating. */
export function stableHash(...parts: (string | number)[]): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (const ch of parts.join('␟')) {
    const c = ch.codePointAt(0)!;
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

// Content keys: identical content = same record (used to find existing docs and dedupe).
export const mealKey = (m: { date: string; mealType: MealType; foodName: string; grams: number }) =>
  [m.date, m.mealType, norm(m.foodName), Math.round(m.grams * 10) / 10].join('|');
export const exerciseSig = (name: string, sets: WorkoutSet[]) =>
  [norm(name), sets.map((s) => `${s.kg}x${s.reps}`).join(',')].join('|');

// ── Export (app model → file) ────────────────────────────────────────────────

export interface ExportSource {
  profile: UserProfile;
  foods: Food[];
  meals: MealEntry[];
  workouts: Workout[];
  weights: WeightLog[];
}

const MEAL_LABEL: Record<MealType, string> = {
  breakfast: 'Breakfast',
  snack: 'Snack',
  lunch: 'Lunch',
  preWorkout: 'Pre-workout',
  postWorkout: 'Post-workout',
  dinner: 'Dinner',
};

export function exerciseDisplayName(e: { exerciseId: string; name?: string }): string {
  return e.name ?? getExercise(e.exerciseId)?.name ?? e.exerciseId.replace(/^custom:/, '');
}

const nullIfAbsent = (v: number | undefined | null) => (v === undefined || v === null ? null : v);

/** Build a schemaVersion-1 file from the app's data — the same format the importer accepts. */
export function buildZidExport(src: ExportSource, exportedAt: string) {
  const byDate = <T extends { date: string }>(a: T[]) => [...a].sort((x, y) => x.date.localeCompare(y.date));
  const g: Goals = src.profile.goals;
  return {
    schemaVersion: 1 as const,
    app: 'Zid',
    exportedAt,
    profile: {
      sex: src.profile.sex ?? null,
      age: nullIfAbsent(src.profile.age),
      heightCm: nullIfAbsent(src.profile.heightCm),
      startWeightKg: nullIfAbsent(src.profile.startWeightKg),
      startBodyFatPct: nullIfAbsent(src.profile.startBodyFatPct),
    },
    goals: { kcal: g.kcal, protein: g.protein, carbs: g.carbs, fat: g.fat, kcalTrainingDay: g.kcalTraining },
    foods: [...src.foods]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((f) => ({ name: f.name, per100g: { kcal: f.per100g.kcal, protein: f.per100g.protein, carbs: f.per100g.carbs, fat: f.per100g.fat } })),
    mealEntries: byDate(src.meals)
      .sort((a, b) => a.date.localeCompare(b.date) || a.loggedAt - b.loggedAt)
      .map((m) => ({
        date: m.date,
        mealType: m.mealTypeLabel ?? MEAL_LABEL[m.mealType],
        foodName: m.foodName,
        grams: m.grams,
        kcal: m.kcal,
        protein: m.protein,
        carbs: m.carbs,
        fat: m.fat,
      })),
    workouts: [...src.workouts]
      .sort((a, b) => a.date.localeCompare(b.date) || a.startedAt - b.startedAt)
      .flatMap((w) =>
        w.exercises.map((e) => {
          const kgs = e.sets.map((s) => s.kg);
          const varied = kgs.some((k) => k !== kgs[0]);
          // Per-set weights travel in notes ("30/40/50 kg"), exactly as the importer reads them.
          const breakdown = `${kgs.join('/')} kg`;
          const hasBreakdown = !!e.notes && setWeights(e.sets.map((s) => s.reps), undefined, e.notes).join('/') === kgs.join('/');
          const notes = varied && !hasBreakdown ? (e.notes ? `${breakdown} — ${e.notes}` : breakdown) : (e.notes ?? null);
          const top = kgs.length ? kgs[kgs.length - 1] : 0;
          return {
            date: w.date,
            session: w.session ?? null,
            exercise: exerciseDisplayName(e),
            chargeKg: e.chargeLabel ?? e.chargeKg ?? top,
            reps: e.sets.map((s) => s.reps),
            notes,
          };
        }),
      ),
    weightLogs: byDate(src.weights).map((w) => ({
      date: w.date,
      weightKg: w.kg,
      bodyFatPct: nullIfAbsent(w.bodyFat),
      arm: nullIfAbsent(w.arm),
      chest: nullIfAbsent(w.chest),
      thigh: nullIfAbsent(w.thigh),
      waist: nullIfAbsent(w.waist),
    })),
  };
}
