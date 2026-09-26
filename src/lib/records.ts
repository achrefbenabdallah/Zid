import type { ExerciseRecord, WorkoutSet } from '@/types';

/** Estimated one-rep max (Epley). Only meaningful for 1–12 reps; 0 for empty sets. */
export function e1rm(s: WorkoutSet): number {
  if (s.reps <= 0 || s.kg <= 0) return 0;
  if (s.reps === 1) return s.kg;
  return Math.round(s.kg * (1 + Math.min(s.reps, 12) / 30) * 10) / 10;
}

export const validSets = (sets: WorkoutSet[]) => sets.filter((s) => s.reps > 0);

/** A set is a PR if it beats the previous heaviest weight or the best estimated 1RM. */
export function isPr(s: WorkoutSet, prev: ExerciseRecord | undefined): boolean {
  if (s.reps <= 0 || s.kg <= 0) return false;
  if (!prev) return false; // first time doing it: nothing to beat yet
  return s.kg > prev.bestKg || e1rm(s) > prev.best1rm;
}

/** Merge a session's sets into the running record for an exercise. */
export function mergeRecord(exerciseId: string, date: string, sets: WorkoutSet[], prev: ExerciseRecord | undefined): ExerciseRecord {
  const done = validSets(sets);
  let bestKg = prev?.bestKg ?? 0;
  let bestKgReps = prev?.bestKgReps ?? 0;
  let best1rm = prev?.best1rm ?? 0;
  for (const s of done) {
    if (s.kg > bestKg || (s.kg === bestKg && s.reps > bestKgReps)) {
      bestKg = s.kg;
      bestKgReps = s.reps;
    }
    best1rm = Math.max(best1rm, e1rm(s));
  }
  // Only move "last time" forward — editing an older workout must not overwrite a newer one.
  const isLatest = !prev || date >= prev.lastDate;
  return {
    exerciseId,
    lastDate: isLatest ? date : prev!.lastDate,
    lastSets: isLatest ? done : prev!.lastSets,
    bestKg,
    bestKgReps,
    best1rm,
  };
}

export function formatSets(sets: WorkoutSet[], kgLabel = ''): string {
  return sets.map((s) => `${s.kg}${kgLabel}×${s.reps}`).join(', ');
}
