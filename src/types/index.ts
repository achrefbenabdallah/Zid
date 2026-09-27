/** Shared domain types. Firestore documents mirror these shapes (ids live in the doc path). */

export type Lang = 'en' | 'ar';

export const MEAL_TYPES = ['breakfast', 'snack', 'lunch', 'preWorkout', 'postWorkout', 'dinner'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Goals extends Macros {
  /** Calorie target on days flagged as training days. */
  kcalTraining: number;
  waterMl: number;
}

/** Tunables for the MET-based workout calorie estimate (see services/calories.ts). */
export interface MetSettings {
  minutesPerSet: number;
  light: number;
  moderate: number;
  hard: number;
}

export interface ReminderSettings {
  enabled: boolean;
  /** "HH:MM" local times. */
  meals: string[];
  workout: string | null;
}

export interface UserProfile {
  displayName: string;
  email: string;
  language: Lang;
  goals: Goals;
  met: MetSettings;
  reminders: ReminderSettings;
  /** Latest logged bodyweight, cached here for calorie estimates. */
  bodyweightKg: number | null;
  createdAt: number;
  /** Optional body profile (set by the user or a data import). */
  sex?: 'male' | 'female';
  age?: number;
  heightCm?: number;
  startWeightKg?: number;
  startBodyFatPct?: number;
}

export type FoodSource = 'seed' | 'user' | 'ai' | 'off';

export interface Food {
  id: string;
  name: string;
  nameAr?: string;
  per100g: Macros;
  barcode?: string;
  favorite: boolean;
  source: FoodSource;
  createdAt: number;
}

export interface MealEntry extends Macros {
  id: string;
  /** Local calendar day "YYYY-MM-DD" — the key used for daily totals. */
  date: string;
  loggedAt: number;
  mealType: MealType;
  /** Original meal label from an import (e.g. "Déjeuner"), kept for round-trip export. */
  mealTypeLabel?: string;
  foodName: string;
  foodId?: string;
  grams: number;
  /** Items logged together (one photo / one "add") share a groupId. */
  groupId: string;
  /** Id of the users/{uid}/mealPhotos doc holding the thumbnail, if any. */
  photoId?: string;
}

export interface MealPhoto {
  id: string;
  date: string;
  /** Small JPEG/WebP data URL (~20 KB). Stored in Firestore instead of Storage (free plan). */
  thumb: string;
}

export interface WorkoutSet {
  kg: number;
  reps: number;
}

export interface WorkoutExercise {
  /** Library id, or "custom:<slug>" for an imported exercise that isn't in the library. */
  exerciseId: string;
  /** Display name for custom exercises / the original imported name. */
  name?: string;
  /** Top/last set weight as given by an import. */
  chargeKg?: number;
  /** Non-numeric weight from an import (e.g. "léger"), kept verbatim for export. */
  chargeLabel?: string;
  sets: WorkoutSet[];
  notes?: string;
}

export type Intensity = 'light' | 'moderate' | 'hard';

export interface Workout {
  id: string;
  date: string;
  startedAt: number;
  exercises: WorkoutExercise[];
  intensity: Intensity;
  caloriesBurned: number;
  notes?: string;
  /** Session label, e.g. "Jambes" / "Push". */
  session?: string;
}

/** Denormalised per-exercise history for "last time" + PR detection. Doc id = exerciseId. */
export interface ExerciseRecord {
  exerciseId: string;
  lastDate: string;
  lastSets: WorkoutSet[];
  bestKg: number;
  bestKgReps: number;
  best1rm: number;
}

export interface Measurements {
  arm?: number;
  chest?: number;
  thigh?: number;
  waist?: number;
  bodyFat?: number;
}

export interface WeightLog extends Measurements {
  id: string;
  date: string;
  kg: number;
  createdAt: number;
}

/** Per-day data that isn't a meal. Doc id = "YYYY-MM-DD". */
export interface DayLog {
  date: string;
  waterMl?: number;
  trainingDay?: boolean;
  /** Number of meal entries on this day (maintained on add/delete) — drives streaks. */
  mealCount?: number;
}

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quadriceps'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs'
  | 'adductors'
  | 'traps';

export interface Exercise {
  id: string;
  group: MuscleGroup;
  name: string;
  nameAr: string;
  howTo: string;
  howToAr: string;
  equipment: string;
  /** Image paths relative to the free-exercise-db images root. */
  images: string[];
}
