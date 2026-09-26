/**
 * Estimated calories burned in a strength session (MET method).
 *
 *   kcal = MET × bodyweight(kg) × hours
 *   hours = completedSets × minutesPerSet / 60
 *
 * MET by intensity (Compendium of Physical Activities, resistance training):
 *   light ≈ 3.5, moderate ≈ 5.0, vigorous ≈ 6.0.
 * minutesPerSet (default 2.5) covers the set itself plus typical rest.
 * All four numbers are adjustable in Settings → "Calories burned".
 * This is an estimate — real burn varies a lot between people.
 */
import type { Intensity, MetSettings } from '@/types';

export const FALLBACK_BODYWEIGHT_KG = 75;

export function estimateWorkoutCalories(sets: number, bodyweightKg: number | null, intensity: Intensity, met: MetSettings): number {
  const kg = bodyweightKg && bodyweightKg > 0 ? bodyweightKg : FALLBACK_BODYWEIGHT_KG;
  const hours = (sets * met.minutesPerSet) / 60;
  return Math.round(met[intensity] * kg * hours);
}
