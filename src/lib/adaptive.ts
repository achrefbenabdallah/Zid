/**
 * Adaptive calorie target — estimates real maintenance (TDEE) from what you actually ate and
 * how your weight actually moved, then recommends a target for your chosen weekly rate.
 *
 *   weight trend  = least-squares slope through the weigh-ins in the window (kg/day)
 *   avg intake    = mean kcal over days with food logged (unlogged days are missing, not 0)
 *   TDEE          = avg intake − slope × 7700        (7700 kcal ≈ 1 kg of body mass)
 *   target (avg)  = TDEE + goalRate(kg/week) × 7700 / 7
 *
 * The rest-day / training-day gap you chose is kept: with training frequency f (days/week),
 *   rest = target − gap × f / 7,  training = rest + gap   → the weekly average equals target.
 */
export const KCAL_PER_KG = 7700;
export const WINDOW_DAYS = 28;
export const MIN_LOGGED_DAYS = 10;
export const MIN_WEIGH_INS = 3;
export const MIN_WEIGHT_SPAN_DAYS = 10;

export interface AdaptiveInput {
  today: string;
  /** Days with food logged in the window (any order). */
  intake: { date: string; kcal: number }[];
  weights: { date: string; kg: number }[];
  /** Days flagged as training days in the window. */
  trainingDays: number;
  /** Desired change in kg per week (+ gain, − loss, 0 maintain). */
  goalRateKgPerWeek: number;
  current: { kcal: number; kcalTraining: number; protein: number; fat: number };
}

export type AdaptiveResult =
  | {
      status: 'needData';
      loggedDays: number;
      weighIns: number;
      weightSpanDays: number;
    }
  | {
      status: 'ok' | 'unreliable';
      loggedDays: number;
      weighIns: number;
      weightSpanDays: number;
      avgIntake: number;
      trendKgPerWeek: number;
      /** Weekly change as % of current trend weight. */
      trendPctPerWeek: number;
      trendWeight: number;
      tdee: number;
      targetAvg: number;
      recommended: { kcal: number; kcalTraining: number; carbs: number };
      /** Recommended rest-day kcal − current rest-day kcal. */
      delta: number;
    };

const dayNum = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
};
const round = (n: number, step: number) => Math.round(n / step) * step;

/** Least-squares fit kg = a + b·day. Returns slope b (kg/day) and the fitted value at `atDay`. */
export function linearTrend(points: { x: number; y: number }[], atX: number): { slope: number; value: number } {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  const sxx = points.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  const sxy = points.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0);
  const slope = sxx ? sxy / sxx : 0;
  return { slope, value: my + slope * (atX - mx) };
}

export function computeAdaptive(input: AdaptiveInput): AdaptiveResult {
  const end = dayNum(input.today);
  const start = end - (WINDOW_DAYS - 1);
  const inWindow = (d: string) => dayNum(d) >= start && dayNum(d) <= end;

  // One value per day (last weigh-in of a day wins; intake summed per day by the caller).
  const intake = new Map<string, number>();
  for (const r of input.intake) if (inWindow(r.date) && r.kcal > 0) intake.set(r.date, r.kcal);
  const weights = new Map<string, number>();
  for (const w of [...input.weights].sort((a, b) => a.date.localeCompare(b.date))) if (inWindow(w.date) && w.kg > 0) weights.set(w.date, w.kg);

  const loggedDays = intake.size;
  const weighIns = weights.size;
  const wDays = [...weights.keys()].map(dayNum);
  const weightSpanDays = wDays.length ? Math.max(...wDays) - Math.min(...wDays) : 0;

  if (loggedDays < MIN_LOGGED_DAYS || weighIns < MIN_WEIGH_INS || weightSpanDays < MIN_WEIGHT_SPAN_DAYS) {
    return { status: 'needData', loggedDays, weighIns, weightSpanDays };
  }

  const avgIntake = [...intake.values()].reduce((s, v) => s + v, 0) / loggedDays;
  const { slope, value: trendWeight } = linearTrend(
    [...weights].map(([d, kg]) => ({ x: dayNum(d), y: kg })),
    end,
  );
  const tdee = avgIntake - slope * KCAL_PER_KG;
  const targetAvg = tdee + (input.goalRateKgPerWeek * KCAL_PER_KG) / 7;

  // Keep the user's training-day gap; split so the weekly average hits the target.
  const gap = Math.max(0, input.current.kcalTraining - input.current.kcal);
  const perWeek = Math.min(7, (input.trainingDays / WINDOW_DAYS) * 7);
  const kcal = round(targetAvg - (gap * perWeek) / 7, 50);
  const kcalTraining = kcal + gap;
  // Protein and fat stay as set; carbs absorb the change.
  const carbs = Math.max(0, Math.round((kcal - input.current.protein * 4 - input.current.fat * 9) / 4));

  const trendKgPerWeek = slope * 7;
  // Implausible maintenance usually means partial logging (snacks not logged) or water swings.
  const status = tdee < 1200 || tdee > 5500 ? 'unreliable' : 'ok';

  return {
    status,
    loggedDays,
    weighIns,
    weightSpanDays,
    avgIntake: Math.round(avgIntake),
    trendKgPerWeek: Math.round(trendKgPerWeek * 100) / 100,
    trendPctPerWeek: trendWeight ? Math.round((trendKgPerWeek / trendWeight) * 1000) / 10 : 0,
    trendWeight: Math.round(trendWeight * 10) / 10,
    tdee: Math.round(tdee),
    targetAvg: Math.round(targetAvg),
    recommended: { kcal, kcalTraining, carbs },
    delta: kcal - input.current.kcal,
  };
}

/** Preset weekly rates offered in the UI (kg/week). */
export const GOAL_RATES = [-0.5, -0.25, 0, 0.25, 0.5] as const;
