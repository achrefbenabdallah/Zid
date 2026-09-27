import type { Intensity, Workout } from '@/types';

/** In-progress workout. Kept in localStorage so closing the app mid-session loses nothing. */
export interface DraftSet {
  kg: number;
  reps: number;
  done: boolean;
}

export interface DraftExercise {
  key: string;
  exerciseId: string;
  /** Original/custom name (imported exercises). */
  name?: string;
  chargeKg?: number;
  chargeLabel?: string;
  notes: string;
  sets: DraftSet[];
}

export interface WorkoutDraft {
  id: string;
  date: string;
  startedAt: number;
  intensity: Intensity;
  notes: string;
  session?: string;
  exercises: DraftExercise[];
  /** True when editing an already-saved workout (not stored as the resumable draft). */
  existing: boolean;
}

const key = (uid: string) => `zid.workoutDraft.${uid}`;

export function loadDraft(uid: string): WorkoutDraft | null {
  try {
    const raw = localStorage.getItem(key(uid));
    return raw ? (JSON.parse(raw) as WorkoutDraft) : null;
  } catch {
    return null;
  }
}

export function storeDraft(uid: string, draft: WorkoutDraft | null) {
  try {
    if (draft) localStorage.setItem(key(uid), JSON.stringify(draft));
    else localStorage.removeItem(key(uid));
  } catch {
    /* storage unavailable — draft lives in memory only */
  }
}

export function draftFromWorkout(w: Workout): WorkoutDraft {
  return {
    id: w.id,
    date: w.date,
    startedAt: w.startedAt,
    intensity: w.intensity,
    notes: w.notes ?? '',
    session: w.session,
    existing: true,
    exercises: w.exercises.map((e, i) => ({
      key: `${e.exerciseId}-${i}`,
      exerciseId: e.exerciseId,
      name: e.name,
      chargeKg: e.chargeKg,
      chargeLabel: e.chargeLabel,
      notes: e.notes ?? '',
      sets: e.sets.map((s) => ({ ...s, done: true })),
    })),
  };
}

export function completedSetCount(d: WorkoutDraft): number {
  return d.exercises.reduce((n, e) => n + e.sets.filter((s) => s.reps > 0).length, 0);
}
