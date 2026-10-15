import type { MuscleGroup, Workout, WorkoutSet } from '@/types';
import { addDays, fromDateKey } from './dates';
import { e1rm, validSets } from './records';

// ── Per-exercise history ────────────────────────────────────────────────────

export interface ExerciseSession {
  workoutId: string;
  date: string;
  sets: WorkoutSet[];
  /** Heaviest set (most reps on ties). */
  top: WorkoutSet;
  best1rm: number;
  /** Σ kg × reps. */
  volume: number;
}

export type PrKind = 'weight' | 'e1rm';
const PR_ORDER: PrKind[] = ['weight', 'e1rm'];

export interface PrEvent {
  date: string;
  workoutId: string;
  set: WorkoutSet;
  kinds: PrKind[];
}

export interface ExerciseHistory {
  sessions: ExerciseSession[]; // oldest first
  prs: PrEvent[]; // newest first
  bestKg: WorkoutSet | null;
  best1rm: number;
  totalSets: number;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Every session of one exercise, with PRs replayed in date order — the same rule as during a
 * workout: a set is a PR when it beats the heaviest weight or best e1RM so far (the first
 * session sets the baseline, so it isn't a PR).
 */
export function exerciseHistory(workouts: Workout[], exerciseId: string): ExerciseHistory {
  const sessions: ExerciseSession[] = [];
  const ordered = [...workouts].sort((a, b) => a.date.localeCompare(b.date) || a.startedAt - b.startedAt);
  for (const w of ordered) {
    const sets = w.exercises.filter((e) => e.exerciseId === exerciseId).flatMap((e) => validSets(e.sets));
    if (!sets.length) continue;
    const top = sets.reduce((a, s) => (s.kg > a.kg || (s.kg === a.kg && s.reps > a.reps) ? s : a));
    sessions.push({
      workoutId: w.id,
      date: w.date,
      sets,
      top,
      best1rm: Math.max(...sets.map(e1rm)),
      volume: r1(sets.reduce((v, s) => v + s.kg * s.reps, 0)),
    });
  }

  const prs: PrEvent[] = [];
  let bestKg: WorkoutSet | null = null;
  let best1rm = 0;
  sessions.forEach((s, i) => {
    let event = null as PrEvent | null;
    for (const set of s.sets) {
      const kinds: PrKind[] = [];
      if (i > 0 && set.kg > 0 && (!bestKg || set.kg > bestKg.kg)) kinds.push('weight');
      if (i > 0 && e1rm(set) > best1rm) kinds.push('e1rm');
      // Keep the strongest PR set of the session.
      if (kinds.length && (!event || e1rm(set) > e1rm(event.set) || set.kg > event.set.kg)) {
        event = { date: s.date, workoutId: s.workoutId, set, kinds: PR_ORDER.filter((k) => kinds.includes(k) || event?.kinds.includes(k)) };
      }
      if (!bestKg || set.kg > bestKg.kg || (set.kg === bestKg.kg && set.reps > bestKg.reps)) bestKg = set;
      best1rm = Math.max(best1rm, e1rm(set));
    }
    if (event) prs.push(event);
  });

  return { sessions, prs: prs.reverse(), bestKg, best1rm, totalSets: sessions.reduce((n, s) => n + s.sets.length, 0) };
}

/** Exercises you've done, most recent first. */
export interface DoneExercise {
  exerciseId: string;
  name?: string;
  lastDate: string;
  sessions: number;
}

export function doneExercises(workouts: Workout[]): DoneExercise[] {
  const map = new Map<string, DoneExercise>();
  for (const w of workouts) {
    for (const e of w.exercises) {
      if (!validSets(e.sets).length) continue;
      const cur = map.get(e.exerciseId);
      if (!cur) map.set(e.exerciseId, { exerciseId: e.exerciseId, name: e.name, lastDate: w.date, sessions: 1 });
      else {
        cur.sessions++;
        if (w.date > cur.lastDate) cur.lastDate = w.date;
        cur.name ??= e.name;
      }
    }
  }
  return [...map.values()].sort((a, b) => b.lastDate.localeCompare(a.lastDate) || b.sessions - a.sessions);
}

// ── Weekly sets per muscle ──────────────────────────────────────────────────

/** Monday of the week containing `date`. */
export function weekStart(date: string): string {
  const dow = fromDateKey(date).getDay(); // 0 = Sunday
  return addDays(date, -((dow + 6) % 7));
}

/** Weekly hard-set range most guidance gives for growth; small muscles get indirect work too. */
export function setTarget(group: MuscleGroup): [number, number] {
  return ['forearms', 'calves', 'abs', 'adductors', 'traps'].includes(group) ? [6, 16] : [10, 20];
}

export type VolumeStatus = 'none' | 'low' | 'good' | 'high';

export function volumeStatus(group: MuscleGroup, sets: number): VolumeStatus {
  const [min, max] = setTarget(group);
  if (sets === 0) return 'none';
  if (sets < min) return 'low';
  if (sets > max) return 'high';
  return 'good';
}

export interface MuscleVolume {
  sets: Map<MuscleGroup, number>;
  /** Sets on exercises whose muscle group is unknown. */
  unassigned: number;
}

/** Completed sets per primary muscle between two day keys (inclusive). */
export function setsPerMuscle(
  workouts: Workout[],
  groupOf: (exerciseId: string) => MuscleGroup | undefined,
  start: string,
  end: string,
): MuscleVolume {
  const sets = new Map<MuscleGroup, number>();
  let unassigned = 0;
  for (const w of workouts) {
    if (w.date < start || w.date > end) continue;
    for (const e of w.exercises) {
      const n = validSets(e.sets).length;
      if (!n) continue;
      const g = groupOf(e.exerciseId);
      if (g) sets.set(g, (sets.get(g) ?? 0) + n);
      else unassigned += n;
    }
  }
  return { sets, unassigned };
}
