/** Plate maths for barbell / plate-loaded lifts, and warm-up ramps. All weights in kg. */

export const ALL_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25] as const;
export const BAR_OPTIONS = [20, 15, 10, 0] as const;

/** Work in hundredths so 1.25 kg plates don't pick up float errors. */
const c = (kg: number) => Math.round(kg * 100);

export interface PlateLoad {
  /** Plates on ONE side, heaviest first. */
  perSide: number[];
  /** What the bar actually weighs with those plates. */
  loadedKg: number;
  /** True when the target can be loaded exactly. */
  exact: boolean;
}

/** Greedy is optimal for standard denominations (each divides into the next few). */
export function platesPerSide(totalKg: number, barKg: number, plates: readonly number[] = ALL_PLATES): PlateLoad {
  const sorted = [...plates].sort((a, b) => b - a);
  let left = Math.max(0, Math.floor((c(totalKg) - c(barKg)) / 2));
  const perSide: number[] = [];
  for (const p of sorted) {
    while (left >= c(p)) {
      perSide.push(p);
      left -= c(p);
    }
  }
  const loadedKg = (c(barKg) + 2 * perSide.reduce((s, p) => s + c(p), 0)) / 100;
  return { perSide, loadedKg, exact: c(loadedKg) === c(Math.max(totalKg, barKg)) };
}

/** Smallest jump you can make with the plates you have (two of the smallest plate). */
export function loadStep(plates: readonly number[]): number {
  return plates.length ? 2 * Math.min(...plates) : 2.5;
}

export interface WarmupSet {
  kg: number;
  reps: number;
}

/**
 * Classic ramp before the first work set: empty bar ×10 (barbell lifts), then ~40% ×8,
 * ~60% ×5, ~80% ×3 — rounded to what you can load, skipping steps that collapse into
 * each other or are too close to the work weight.
 */
export function warmupSets(workKg: number, opts: { barKg: number; step: number }): WarmupSet[] {
  const { barKg, step } = opts;
  if (workKg <= 0) return [];
  const round = (kg: number) => (step > 0 ? barKg + Math.round((kg - barKg) / step) * step : kg);
  const out: WarmupSet[] = [];
  if (barKg > 0 && workKg > barKg + step) out.push({ kg: barKg, reps: 10 });
  for (const [pct, reps] of [
    [0.4, 8],
    [0.6, 5],
    [0.8, 3],
  ] as const) {
    const kg = Math.round(round(workKg * pct) * 100) / 100;
    const prev = out[out.length - 1]?.kg ?? 0;
    if (kg <= prev || kg <= barKg || kg > workKg - step || kg <= 0) continue;
    out.push({ kg, reps });
  }
  return out;
}

/** IWF-style plate colours (physical, so the same in light and dark mode). */
export const PLATE_STYLE: Record<number, { bg: string; fg: string; h: number }> = {
  25: { bg: '#d6384b', fg: '#fff', h: 100 },
  20: { bg: '#2563eb', fg: '#fff', h: 100 },
  15: { bg: '#e9a100', fg: '#1a1a1a', h: 90 },
  10: { bg: '#1f8a4c', fg: '#fff', h: 80 },
  5: { bg: '#f4f4f5', fg: '#1a1a1a', h: 62 },
  2.5: { bg: '#d6384b', fg: '#fff', h: 50 },
  1.25: { bg: '#a1a1aa', fg: '#1a1a1a', h: 42 },
};
