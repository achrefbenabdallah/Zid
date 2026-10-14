import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { getDoc } from 'firebase/firestore';
import { BookmarkPlus, Check, Flame, Plus, Timer, Trash2, TrendingUp, Trophy, X } from 'lucide-react';
import { Screen, Spinner, Empty } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { NumberField } from '@/components/NumberField';
import { useToast } from '@/components/Toast';
import { useSession } from '@/features/auth/AuthProvider';
import { markTemplateUsed, ref, saveWorkout, useExerciseRecords, useTemplates } from '@/services/data';
import { estimateWorkoutCalories } from '@/services/calories';
import { exerciseName } from '@/data/exercises';
import { formatSets, isPr, mergeRecord } from '@/lib/records';
import { isProgress, suggestNextSets } from '@/lib/progression';
import { toDateKey } from '@/lib/dates';
import { uid as newId } from '@/lib/macros';
import type { Exercise, ExerciseRecord, Intensity, Workout, WorkoutTemplate } from '@/types';
import { ExerciseBrowser, ExerciseDetail, ExerciseThumb } from './ExerciseViews';
import { useExerciseCatalog } from './useExerciseCatalog';
import { TemplateEditor } from './TemplateEditor';
import { draftFromTemplate, progressionFor, templateFromExercises } from './templates';
import { RestTimer, REST_PRESETS } from './RestTimer';
import { completedSetCount, draftFromWorkout, loadDraft, storeDraft, type DraftExercise, type WorkoutDraft } from './draft';

const REST_KEY = 'zid.restSeconds';
const readRest = () => {
  try {
    return Number(localStorage.getItem(REST_KEY)) || 90;
  } catch {
    return 90;
  }
};

function newDraft(): WorkoutDraft {
  return { id: newId(), date: toDateKey(), startedAt: Date.now(), intensity: 'moderate', notes: '', exercises: [], existing: false };
}

export default function SessionPage() {
  const { t, i18n } = useTranslation();
  const { uid, profile } = useSession();
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const records = useExerciseRecords();
  const recordMap = useMemo(() => new Map(records.data.map((r) => [r.exerciseId, r as ExerciseRecord])), [records.data]);
  const catalog = useExerciseCatalog();
  const equipmentOf = (exerciseId: string) => catalog.get(exerciseId)?.equipment;
  const templates = useTemplates();
  const [params, setParams] = useSearchParams();
  const templateParam = id ? null : params.get('template');

  const [draft, setDraft] = useState<WorkoutDraft | null>(() => (id || templateParam ? null : (loadDraft(uid) ?? newDraft())));
  const [tplEdit, setTplEdit] = useState<{ tpl: WorkoutTemplate; isNew: boolean } | null>(null);
  const templateStarted = useRef(false);
  const [picker, setPicker] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [restSeconds, setRestSeconds] = useState(readRest);
  const [saving, setSaving] = useState(false);

  // Editing a saved workout: load it once.
  useEffect(() => {
    if (!id) return;
    void getDoc(ref.workout(uid, id)).then((snap) => {
      if (snap.exists()) setDraft(draftFromWorkout({ id: snap.id, ...snap.data() } as Workout));
      else nav('/train', { replace: true });
    });
  }, [id, uid, nav]);

  // Starting from a template: wait for templates + "last time" records, then build the session.
  useEffect(() => {
    // Wait for server-confirmed data (the offline cache may lack recent records), unless offline.
    const ready = (q: { loading: boolean; synced: boolean }) => !q.loading && (q.synced || !navigator.onLine);
    if (!templateParam || templateStarted.current || !ready(templates) || !ready(records)) return;
    templateStarted.current = true;
    const tpl = templates.data.find((x) => x.id === templateParam);
    const inProgress = loadDraft(uid);
    setParams({}, { replace: true });
    if (!tpl) return setDraft(inProgress ?? newDraft());
    // Don't silently throw away a workout in progress.
    if (inProgress?.exercises.length && !confirm(t('templates.replaceInProgress'))) return setDraft(inProgress);
    setDraft(draftFromTemplate(tpl, recordMap));
  }, [templateParam, templates, records, recordMap, uid, setParams, t]);

  // Persist the resumable draft on every change (new sessions only).
  useEffect(() => {
    if (draft && !draft.existing) storeDraft(uid, draft);
  }, [draft, uid]);

  const patch = useCallback((fn: (d: WorkoutDraft) => WorkoutDraft) => setDraft((d) => (d ? fn(d) : d)), []);
  const patchExercise = (key: string, fn: (e: DraftExercise) => DraftExercise) =>
    patch((d) => ({ ...d, exercises: d.exercises.map((e) => (e.key === key ? fn(e) : e)) }));

  if (!draft) return <Spinner />;

  const sets = completedSetCount(draft);
  const kcal = estimateWorkoutCalories(sets, profile.bodyweightKg, draft.intensity, profile.met);
  const selectedIds = new Set(draft.exercises.map((e) => e.exerciseId));

  const addExercise = (ex: Exercise) => {
    const exerciseId = ex.id;
    const last = recordMap.get(exerciseId)?.lastSets;
    // Pre-fill with last session's sets so beating them is one tap away.
    const sets = last?.length ? last.map((s) => ({ ...s, done: false })) : [{ kg: 0, reps: 0, done: false }];
    // Your own exercises keep their name on the workout, so history reads well even if deleted later.
    const name = ex.custom ? ex.name : undefined;
    patch((d) => ({ ...d, exercises: [...d.exercises, { key: newId(), exerciseId, name, notes: '', sets }] }));
    setPicker(false);
  };

  const toggleDone = (ex: DraftExercise, i: number) => {
    const wasDone = ex.sets[i].done;
    patchExercise(ex.key, (e) => ({ ...e, sets: e.sets.map((s, j) => (j === i ? { ...s, done: !s.done } : s)) }));
    if (!wasDone) setRestEnd(Date.now() + restSeconds * 1000);
  };

  const pickRest = (s: number) => {
    setRestSeconds(s);
    try {
      localStorage.setItem(REST_KEY, String(s));
    } catch {
      /* ignore */
    }
  };

  const openSaveAsTemplate = () => {
    const base = templateFromExercises(draft.session ?? '', draft.exercises, equipmentOf);
    const source = templates.data.find((x) => x.id === draft.templateId);
    // Keep the settings you chose in the template (or on this session) for exercises already there.
    const exercises = base.exercises.map((te, i) => {
      const fromSession = draft.exercises.filter((e) => e.sets.length)[i];
      const fromTemplate = source?.exercises.find((x) => x.exerciseId === te.exerciseId);
      return {
        ...te,
        repMin: fromSession?.repMin ?? fromTemplate?.repMin ?? te.repMin,
        repMax: fromSession?.repMax ?? fromTemplate?.repMax ?? te.repMax,
        stepKg: fromSession?.stepKg ?? fromTemplate?.stepKg ?? te.stepKg,
      };
    });
    setTplEdit(
      source
        ? { tpl: { ...source, exercises }, isNew: false }
        : { tpl: { ...base, exercises }, isNew: true },
    );
  };

  const discard = () => {
    if (!draft.existing && draft.exercises.length && !confirm(t('workouts.discardConfirm'))) return;
    if (!draft.existing) storeDraft(uid, null);
    nav('/train', { replace: true });
  };

  const finish = async () => {
    setSaving(true);
    try {
      const exercises = draft.exercises
        .map((e) => {
          const sets = e.sets.filter((s) => s.reps > 0).map(({ kg, reps }) => ({ kg, reps }));
          return {
            exerciseId: e.exerciseId,
            name: e.name,
            sets,
            notes: e.notes.trim() || undefined,
            // Imported weights stay only while they still describe the sets.
            chargeKg: e.chargeKg !== undefined && sets.some((s) => s.kg === e.chargeKg) ? e.chargeKg : undefined,
            chargeLabel: e.chargeLabel && sets.every((s) => s.kg === 0) ? e.chargeLabel : undefined,
          };
        })
        .filter((e) => e.sets.length);
      if (!exercises.length) {
        toast(t('workouts.emptySession'), 'error');
        return;
      }
      const prCount = draft.existing ? 0 : exercises.filter((e) => e.sets.some((s) => isPr(s, recordMap.get(e.exerciseId)))).length;
      const workout: Workout = {
        id: draft.id,
        date: draft.date,
        startedAt: draft.startedAt,
        intensity: draft.intensity,
        notes: draft.notes.trim() || undefined,
        session: draft.session?.trim() || undefined,
        templateId: draft.templateId,
        exercises,
        caloriesBurned: kcal,
      };
      const newRecords = exercises.map((e) => mergeRecord(e.exerciseId, draft.date, e.sets, recordMap.get(e.exerciseId)));
      void saveWorkout(uid, workout, newRecords).catch(() => toast(t('common.error'), 'error'));
      if (draft.templateId && !draft.existing) void markTemplateUsed(uid, draft.templateId).catch(() => undefined);
      if (!draft.existing) storeDraft(uid, null);
      toast(prCount ? `${t('workouts.saved')} ${t('workouts.newPrs', { count: prCount })}` : t('workouts.saved'), 'success');
      nav('/train', { replace: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      title={t('workouts.session')}
      back
      actions={
        <>
          {draft.exercises.length > 0 && (
            <button className="rounded-full p-2 text-muted hover:bg-surface-2" onClick={openSaveAsTemplate} aria-label={t('templates.saveAsTemplate')} title={t('templates.saveAsTemplate')}>
              <BookmarkPlus size={20} />
            </button>
          )}
          <button className="btn-ghost py-1.5 text-danger" onClick={discard}>
            {t('workouts.discard')}
          </button>
        </>
      }
    >
      {/* Session settings */}
      <div className="card space-y-3">
        <div>
          <label className="label" htmlFor="w-session">{t('templates.sessionName')}</label>
          <input
            id="w-session"
            className="input"
            maxLength={60}
            placeholder={t('templates.namePlaceholder')}
            value={draft.session ?? ''}
            onChange={(e) => patch((d) => ({ ...d, session: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="w-date">{t('meals.date')}</label>
            <input id="w-date" type="date" className="input num" max={toDateKey()} value={draft.date} onChange={(e) => e.target.value && patch((d) => ({ ...d, date: e.target.value }))} />
          </div>
          <div>
            <span className="label">{t('workouts.rest')}</span>
            <div className="flex gap-1">
              {REST_PRESETS.map((s) => (
                <button
                  key={s}
                  className={`flex-1 rounded-lg py-2.5 text-xs font-semibold ${restSeconds === s ? 'bg-ink text-bg' : 'bg-surface-2'}`}
                  onClick={() => pickRest(s)}
                  aria-pressed={restSeconds === s}
                  aria-label={`${t('workouts.rest')} ${s < 120 ? s : s / 60} ${s < 120 ? t('common.sec') : t('common.min')}`}
                >
                  <span className="num">{s < 120 ? s : s / 60}</span> {s < 120 ? t('common.sec') : t('common.min')}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <span className="label">{t('workouts.intensity')}</span>
          <div className="grid grid-cols-3 gap-2">
            {(['light', 'moderate', 'hard'] as Intensity[]).map((i) => (
              <button key={i} className={draft.intensity === i ? 'chip-active justify-center' : 'chip justify-center'} onClick={() => patch((d) => ({ ...d, intensity: i }))}>
                {t(`workouts.${i}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Exercises */}
      <div className="mt-4 space-y-3">
        {draft.exercises.length === 0 && <Empty>{t('workouts.emptySession')}</Empty>}
        {draft.exercises.map((ex) => {
          const e = catalog.get(ex.exerciseId);
          const rec = recordMap.get(ex.exerciseId);
          const showLast = rec && !(draft.existing && rec.lastDate === draft.date);
          // Next-weight suggestion (double progression) — new sessions only, and only if it's
          // different from both last time and what's already in the inputs.
          const next = showLast && !draft.existing && rec.lastSets.length ? suggestNextSets(rec.lastSets, progressionFor(ex, rec, equipmentOf)) : [];
          const applied = next.length > 0 && next.length === ex.sets.length && next.every((s, i) => ex.sets[i].kg === s.kg && ex.sets[i].reps === s.reps);
          const showNext = next.length > 0 && isProgress(rec!.lastSets, next) && !applied;
          return (
            <section key={ex.key} className="card p-3">
              <div className="flex items-center gap-3">
                {e && (
                  <button onClick={() => setInfo(ex.exerciseId)} aria-label={t('workouts.howTo')}>
                    <ExerciseThumb exercise={e} size={48} />
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{exerciseName(e, i18n.language, ex.name ?? ex.exerciseId)}</h3>
                  <p className="truncate text-xs text-muted">
                    {showLast ? (
                      <>
                        {t('workouts.lastTime')}: <span className="num">{formatSets(rec.lastSets)}</span>
                        {rec.bestKg > 0 && (
                          <>
                            {' · '}
                            {t('workouts.best')}: <span className="num">{rec.bestKg}×{rec.bestKgReps}</span>
                          </>
                        )}
                      </>
                    ) : rec && rec.bestKg > 0 ? (
                      // Editing the session that *is* the latest record: show the best, not "first time".
                      <>
                        {t('workouts.best')}: <span className="num">{rec.bestKg}×{rec.bestKgReps}</span>
                      </>
                    ) : rec ? null : (
                      t('workouts.firstTime')
                    )}
                  </p>
                </div>
                <button
                  className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger"
                  onClick={() => patch((d) => ({ ...d, exercises: d.exercises.filter((x) => x.key !== ex.key) }))}
                  aria-label={t('workouts.removeExercise')}
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {showNext && (
                <div className="mt-2 flex items-center gap-2 rounded-xl bg-brand/10 px-3 py-2">
                  <TrendingUp size={16} className="shrink-0 text-brand" />
                  <p className="min-w-0 flex-1 text-xs">
                    <span className="font-semibold text-brand">{t('templates.next')}:</span> <span className="num">{formatSets(next)}</span>
                  </p>
                  <button
                    className="shrink-0 rounded-lg bg-brand px-2.5 py-1 text-xs font-semibold text-brand-ink"
                    onClick={() => patchExercise(ex.key, (x) => ({ ...x, sets: next.map((s) => ({ ...s, done: false })) }))}
                  >
                    {t('templates.apply')}
                  </button>
                </div>
              )}

              <div className="mt-3 grid grid-cols-[2rem_1fr_1fr_2.75rem_2rem] items-end gap-2 text-xs text-muted">
                <span className="text-center">#</span>
                <span>{t('common.kg')}</span>
                <span>{t('workouts.reps')}</span>
                <span />
                <span />
              </div>
              {ex.sets.map((s, i) => {
                const pr = !draft.existing && isPr(s, rec);
                return (
                  <div key={i} className="mt-1.5 grid grid-cols-[2rem_1fr_1fr_2.75rem_2rem] items-center gap-2">
                    <span className="num text-center text-sm font-semibold text-muted">
                      {pr ? <Trophy size={16} className="mx-auto text-carbs" aria-label={t('workouts.pr')} /> : i + 1}
                    </span>
                    <NumberField value={s.kg} onChange={(kg) => patchExercise(ex.key, (x) => ({ ...x, sets: x.sets.map((y, j) => (j === i ? { ...y, kg } : y)) }))} />
                    <NumberField value={s.reps} onChange={(reps) => patchExercise(ex.key, (x) => ({ ...x, sets: x.sets.map((y, j) => (j === i ? { ...y, reps: Math.round(reps) } : y)) }))} />
                    <button
                      className={`grid h-11 w-11 place-items-center rounded-xl ${s.done ? 'bg-brand text-brand-ink' : 'bg-surface-2 text-muted'}`}
                      onClick={() => toggleDone(ex, i)}
                      aria-pressed={s.done}
                      aria-label={t('common.done')}
                    >
                      <Check size={20} />
                    </button>
                    <button
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:text-danger"
                      onClick={() => patchExercise(ex.key, (x) => ({ ...x, sets: x.sets.filter((_, j) => j !== i) }))}
                      aria-label={t('workouts.removeSet')}
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })}
              <button
                className="btn-ghost mt-3 w-full py-2"
                onClick={() =>
                  patchExercise(ex.key, (x) => {
                    const last = x.sets[x.sets.length - 1];
                    return { ...x, sets: [...x.sets, { kg: last?.kg ?? 0, reps: last?.reps ?? 0, done: false }] };
                  })
                }
              >
                <Plus size={16} /> {t('workouts.addSet')}
              </button>
              <textarea
                className="input mt-2 min-h-0 resize-none py-2 text-sm"
                rows={1}
                placeholder={t('workouts.notesPlaceholder')}
                value={ex.notes}
                onChange={(ev) => patchExercise(ex.key, (x) => ({ ...x, notes: ev.target.value }))}
              />
            </section>
          );
        })}

        <button className="btn-ghost w-full border border-dashed border-line py-3" onClick={() => setPicker(true)}>
          <Plus size={18} /> {t('workouts.addExercise')}
        </button>
      </div>

      {/* Summary + finish */}
      <div className="sticky bottom-0 -mx-4 mt-4 border-t border-line bg-bg/95 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted">
            {t('workouts.sets', { count: sets })}
            {!profile.bodyweightKg && <span className="block text-[11px]">{t('workouts.noBodyweight')}</span>}
          </span>
          <span className="flex items-center gap-1 font-bold">
            <Flame size={16} className="text-danger" />
            <span className="num">{kcal}</span> {t('common.kcal')}
          </span>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => setRestEnd(Date.now() + restSeconds * 1000)} aria-label={t('workouts.rest')}>
            <Timer size={18} />
          </button>
          <button className="btn-primary flex-1 py-3 text-base" disabled={saving || sets === 0} onClick={() => void finish()}>
            {t('workouts.finish')}
          </button>
        </div>
      </div>

      <RestTimer endAt={restEnd} onChange={setRestEnd} />

      <Sheet open={picker} onClose={() => setPicker(false)} title={t('workouts.addExercise')}>
        <ExerciseBrowser onPick={addExercise} selectedIds={selectedIds} />
      </Sheet>
      <ExerciseDetail exercise={info ? (catalog.get(info) ?? null) : null} onClose={() => setInfo(null)} />
      <TemplateEditor
        initial={tplEdit?.tpl ?? null}
        isNew={tplEdit?.isNew}
        onClose={() => setTplEdit(null)}
        onSaved={(tpl) => patch((d) => ({ ...d, templateId: tpl.id, session: d.session?.trim() ? d.session : tpl.name }))}
      />
    </Screen>
  );
}
