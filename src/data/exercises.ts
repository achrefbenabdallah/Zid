import raw from './exercises.json';
import type { Exercise, Lang, MuscleGroup } from '@/types';

/** Curated library built by scripts/build-exercises.mjs from free-exercise-db (public domain). */
export const EXERCISES = raw as Exercise[];

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
  'adductors',
  'traps',
];

const byId = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise | undefined {
  return byId.get(id);
}

export function exerciseName(e: Exercise | undefined, lang: Lang | string, fallback = ''): string {
  if (!e) return fallback;
  return lang === 'ar' ? e.nameAr : e.name;
}

export function exerciseImage(path: string): string {
  return `/exercises/${path}`;
}

/** Cover image for a muscle group tile — first exercise of the group. */
export function groupCover(group: MuscleGroup): string | undefined {
  const first = EXERCISES.find((e) => e.group === group);
  return first ? exerciseImage(first.images[0]) : undefined;
}
