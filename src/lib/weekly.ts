import type { DayLog, Goals, MealEntry, MuscleGroup, WeightLog, Workout } from '@/types';
import { addDays, dayRange } from './dates';
import { validSets } from './records';
import { exerciseHistory, setsPerMuscle, volumeStatus } from './training';

/**
 * One week's numbers, computed on the phone. Only these aggregates are sent to the AI for the
 * weekly summary — never individual meals, photos or notes.
 */
export interface WeekStats {
  weekStart: string;
  weekEnd: string;
  goals: { kcalRestDay: number; kcalTrainingDay: number; proteinG: number; weightGoalKgPerWeek: number | null };
  nutrition: {
    daysLogged: number;
    avgKcal: number;
    avgProteinG: number;
    avgCarbsG: number;
    avgFatG: number;
    /** Days with protein ≥ 90% of goal. */
    proteinGoalDays: number;
    /** Days within ±10% of that day's calorie goal. */
    kcalOnTargetDays: number;
    avgWaterMl: number;
  };
  training: {
    sessions: number;
    sets: number;
    prs: { exercise: string; set: string }[];
    musclesInRange: string[];
    musclesBelowRange: string[];
    musclesAboveRange: string[];
  };
  bodyweight: { weighIns: number; latestKg: number | null; changeKgVsPreviousWeek: number | null };
  previousWeek: { daysLogged: number; avgKcal: number; avgProteinG: number; sessions: number; sets: number };
}

export interface WeekInput {
  weekStart: string;
  meals: Pick<MealEntry, 'date' | 'kcal' | 'protein' | 'carbs' | 'fat'>[];
  days: Pick<DayLog, 'date' | 'trainingDay' | 'waterMl'>[];
  workouts: Workout[];
  weights: Pick<WeightLog, 'date' | 'kg'>[];
  goals: Goals;
  goalRateKgPerWeek?: number;
  groupOf: (exerciseId: string) => MuscleGroup | undefined;
  /** Display name for exercises and muscles in the summary's language. */
  exerciseName: (exerciseId: string, stored?: string) => string;
  muscleName: (g: MuscleGroup) => string;
}

const round = (n: number, d = 0) => Math.round(n * 10 ** d) / 10 ** d;

function nutritionFor(input: WeekInput, start: string, end: string) {
  const byDay = new Map<string, { kcal: number; protein: number; carbs: number; fat: number }>();
  for (const m of input.meals) {
    if (m.date < start || m.date > end) continue;
    const d = byDay.get(m.date) ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    d.kcal += m.kcal;
    d.protein += m.protein;
    d.carbs += m.carbs;
    d.fat += m.fat;
    byDay.set(m.date, d);
  }
  const training = new Set(input.days.filter((d) => d.trainingDay).map((d) => d.date));
  const logged = [...byDay.entries()];
  const n = logged.length || 1;
  const avg = (k: 'kcal' | 'protein' | 'carbs' | 'fat') => logged.reduce((s, [, d]) => s + d[k], 0) / n;
  const water = input.days.filter((d) => d.date >= start && d.date <= end && (d.waterMl ?? 0) > 0);
  return {
    daysLogged: logged.length,
    avgKcal: Math.round(avg('kcal')),
    avgProteinG: Math.round(avg('protein')),
    avgCarbsG: Math.round(avg('carbs')),
    avgFatG: Math.round(avg('fat')),
    proteinGoalDays: logged.filter(([, d]) => d.protein >= input.goals.protein * 0.9).length,
    kcalOnTargetDays: logged.filter(([date, d]) => {
      const goal = training.has(date) ? input.goals.kcalTraining : input.goals.kcal;
      return Math.abs(d.kcal - goal) <= goal * 0.1;
    }).length,
    avgWaterMl: water.length ? Math.round(water.reduce((s, d) => s + (d.waterMl ?? 0), 0) / water.length) : 0,
  };
}

function trainingFor(workouts: Workout[], start: string, end: string) {
  const inWeek = workouts.filter((w) => w.date >= start && w.date <= end);
  return { sessions: inWeek.length, sets: inWeek.reduce((n, w) => n + w.exercises.reduce((m, e) => m + validSets(e.sets).length, 0), 0) };
}

export function weekStats(input: WeekInput): WeekStats {
  const start = input.weekStart;
  const end = addDays(start, 6);
  const prevStart = addDays(start, -7);
  const prevEnd = addDays(start, -1);

  // PRs set this week, replayed against all earlier history.
  const ids = new Set(input.workouts.filter((w) => w.date >= start && w.date <= end).flatMap((w) => w.exercises.map((e) => e.exerciseId)));
  const stored = new Map(input.workouts.flatMap((w) => w.exercises.filter((e) => e.name).map((e) => [e.exerciseId, e.name!] as const)));
  const prs = [...ids]
    .flatMap((id) =>
      exerciseHistory(input.workouts, id)
        .prs.filter((p) => p.date >= start && p.date <= end)
        .slice(0, 1) // the best one per exercise
        .map((p) => ({ exercise: input.exerciseName(id, stored.get(id)), set: `${p.set.kg} kg × ${p.set.reps}` })),
    )
    .slice(0, 6);

  const volume = setsPerMuscle(input.workouts, input.groupOf, start, end);
  const groups = [...new Set([...volume.sets.keys()])];
  const byStatus = (s: string) => groups.filter((g) => volumeStatus(g, volume.sets.get(g) ?? 0) === s).map(input.muscleName);
  // Big muscles you didn't train at all count as below range too.
  const untrained = (['chest', 'back', 'shoulders', 'quadriceps', 'hamstrings'] as MuscleGroup[]).filter((g) => !volume.sets.has(g)).map(input.muscleName);

  const weights = [...input.weights].sort((a, b) => a.date.localeCompare(b.date));
  const thisWeek = weights.filter((w) => w.date >= start && w.date <= end);
  const before = weights.filter((w) => w.date < start).pop();
  const latest = thisWeek[thisWeek.length - 1];

  const t = trainingFor(input.workouts, start, end);
  const pt = trainingFor(input.workouts, prevStart, prevEnd);
  const pn = nutritionFor(input, prevStart, prevEnd);

  return {
    weekStart: start,
    weekEnd: end,
    goals: {
      kcalRestDay: input.goals.kcal,
      kcalTrainingDay: input.goals.kcalTraining,
      proteinG: input.goals.protein,
      weightGoalKgPerWeek: input.goalRateKgPerWeek ?? null,
    },
    nutrition: nutritionFor(input, start, end),
    training: {
      ...t,
      prs,
      musclesInRange: byStatus('good'),
      musclesBelowRange: t.sessions ? [...byStatus('low'), ...untrained] : [],
      musclesAboveRange: byStatus('high'),
    },
    bodyweight: {
      weighIns: thisWeek.length,
      latestKg: latest?.kg ?? null,
      changeKgVsPreviousWeek: latest && before ? round(latest.kg - before.kg, 1) : null,
    },
    previousWeek: { daysLogged: pn.daysLogged, avgKcal: pn.avgKcal, avgProteinG: pn.avgProteinG, ...pt },
  };
}

/** Nothing worth summarising. */
export const isEmptyWeek = (s: WeekStats) => s.nutrition.daysLogged === 0 && s.training.sessions === 0 && s.bodyweight.weighIns === 0;

/** Days of a week, for range queries. */
export const weekDays = (weekStart: string) => dayRange(weekStart, addDays(weekStart, 6));
