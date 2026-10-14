import { uid as newId } from '@/lib/macros';
import { toDateKey } from '@/lib/dates';
import { norm } from '@/lib/zidFormat';
import { defaultRepRange, defaultStepKg, type Progression } from '@/lib/progression';
import type { ExerciseRecord, TemplateExercise, Workout, WorkoutExercise, WorkoutTemplate } from '@/types';
import type { DraftExercise, WorkoutDraft } from './draft';

type EquipmentOf = (exerciseId: string) => string | undefined;

/** Template exercise from a logged exercise: set count + rep range inferred from what was done. */
export function templateExerciseFrom(e: Pick<WorkoutExercise, 'exerciseId' | 'name' | 'sets'>, equipmentOf: EquipmentOf): TemplateExercise {
  const done = e.sets.filter((s) => s.reps > 0);
  const { repMin, repMax } = defaultRepRange(done);
  return {
    exerciseId: e.exerciseId,
    ...(e.name ? { name: e.name } : {}),
    sets: Math.max(1, done.length || e.sets.length),
    repMin,
    repMax,
    stepKg: defaultStepKg(equipmentOf(e.exerciseId)),
  };
}

export function templateFromExercises(name: string, exercises: Pick<WorkoutExercise, 'exerciseId' | 'name' | 'sets'>[], equipmentOf: EquipmentOf): WorkoutTemplate {
  return {
    id: newId(),
    name: name.trim(),
    exercises: exercises.filter((e) => e.sets.length).map((e) => templateExerciseFrom(e, equipmentOf)),
    createdAt: Date.now(),
  };
}

/**
 * Start a session from a template: exercises in template order, each pre-filled with
 * last time's sets (the thing to beat) or, with no history, empty sets at the bottom of the range.
 */
export function draftFromTemplate(tpl: WorkoutTemplate, records: Map<string, ExerciseRecord>): WorkoutDraft {
  return {
    id: newId(),
    date: toDateKey(),
    startedAt: Date.now(),
    intensity: 'moderate',
    notes: '',
    session: tpl.name,
    templateId: tpl.id,
    existing: false,
    exercises: tpl.exercises.map(
      (te): DraftExercise => {
        const last = records.get(te.exerciseId)?.lastSets ?? [];
        return {
          key: newId(),
          exerciseId: te.exerciseId,
          name: te.name,
          notes: '',
          repMin: te.repMin,
          repMax: te.repMax,
          stepKg: te.stepKg,
          sets: last.length ? last.map((s) => ({ ...s, done: false })) : Array.from({ length: te.sets }, () => ({ kg: 0, reps: te.repMin, done: false })),
        };
      },
    ),
  };
}

/** Progression settings for an exercise in a session: from its template, else inferred. */
export function progressionFor(ex: Pick<DraftExercise, 'repMin' | 'repMax' | 'stepKg' | 'exerciseId'>, record: ExerciseRecord | undefined, equipmentOf: EquipmentOf): Progression {
  const inferred = defaultRepRange(record?.lastSets);
  return {
    repMin: ex.repMin ?? inferred.repMin,
    repMax: ex.repMax ?? inferred.repMax,
    stepKg: ex.stepKg ?? defaultStepKg(equipmentOf(ex.exerciseId)),
  };
}

/** Named past sessions that aren't templates yet — offered as one-tap "save as template". */
export function templateCandidates(workouts: Workout[], templates: WorkoutTemplate[]): Workout[] {
  const taken = new Set(templates.map((t) => norm(t.name)));
  const seen = new Set<string>();
  return [...workouts]
    .sort((a, b) => b.date.localeCompare(a.date) || b.startedAt - a.startedAt)
    .filter((w) => {
      const key = w.session ? norm(w.session) : '';
      if (!key || taken.has(key) || seen.has(key) || !w.exercises.length) return false;
      seen.add(key); // most recent session of each name
      return true;
    });
}
