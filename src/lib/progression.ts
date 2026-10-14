/**
 * Next-weight suggestions — "double progression", applied set by set so pyramids keep their shape:
 *   • last time you reached the TOP of the rep range on a set → add one weight step, reps back to the bottom
 *   • otherwise → same weight, one more rep (capped at the top of the range)
 * Sets without weight (bodyweight, or text weights like "léger") only progress in reps.
 */
import type { WorkoutSet } from '@/types';

export interface Progression {
  repMin: number;
  repMax: number;
  /** Smallest sensible weight jump for this exercise, in kg. */
  stepKg: number;
}

/** Typical smallest jump per equipment (dataset names, see exercises.json). */
export function defaultStepKg(equipment: string | undefined): number {
  switch (equipment) {
    case 'barbell':
    case 'e-z curl bar':
      return 2.5; // 1.25 kg plate each side
    case 'dumbbell':
      return 2;
    case 'kettlebells':
      return 4;
    case 'body only':
      return 0;
    default:
      return 5; // machine stacks / cables
  }
}

/** Rep range inferred from the last session: its most common rep count, +2 on top. */
export function defaultRepRange(lastSets: WorkoutSet[] | undefined): { repMin: number; repMax: number } {
  const reps = (lastSets ?? []).map((s) => s.reps).filter((r) => r > 0);
  if (!reps.length) return { repMin: 8, repMax: 12 };
  const counts = new Map<number, number>();
  for (const r of reps) counts.set(r, (counts.get(r) ?? 0) + 1);
  const mode = [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
  return { repMin: mode, repMax: mode + 2 };
}

const roundKg = (kg: number) => Math.round(kg * 100) / 100;

export function suggestNextSets(lastSets: WorkoutSet[], p: Progression): WorkoutSet[] {
  const repMin = Math.max(1, Math.round(p.repMin));
  const repMax = Math.max(repMin, Math.round(p.repMax));
  return lastSets
    .filter((s) => s.reps > 0)
    .map((s) => {
      if (s.kg > 0 && p.stepKg > 0 && s.reps >= repMax) return { kg: roundKg(s.kg + p.stepKg), reps: repMin };
      // Below the range (e.g. failed reps): aim for the bottom of the range first.
      return { kg: s.kg, reps: Math.min(repMax, Math.max(repMin, s.reps + 1)) };
    });
}

/** True when the suggestion differs from what was done (nothing to propose otherwise). */
export function isProgress(last: WorkoutSet[], next: WorkoutSet[]): boolean {
  return next.some((s, i) => !last[i] || s.kg !== last[i].kg || s.reps !== last[i].reps);
}
