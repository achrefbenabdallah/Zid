import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { BookmarkPlus, BookOpen, ChevronRight, Dumbbell, Flame, ListChecks, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { Screen, Empty, Spinner } from '@/components/Screen';
import { useSession } from '@/features/auth/AuthProvider';
import { deleteWorkout, saveTemplate, useRecentWorkouts, useTemplates } from '@/services/data';
import { MUSCLE_GROUPS, exerciseName, groupCover } from '@/data/exercises';
import { formatDay, toDateKey } from '@/lib/dates';
import { intlLocale } from '@/i18n';
import type { Workout, WorkoutTemplate } from '@/types';
import { loadDraft } from './draft';
import { useToast } from '@/components/Toast';
import { uid as newId } from '@/lib/macros';
import { TemplateEditor } from './TemplateEditor';
import { templateCandidates, templateFromExercises } from './templates';
import { useExerciseCatalog } from './useExerciseCatalog';

export default function TrainPage() {
  const { t, i18n } = useTranslation();
  const { uid } = useSession();
  const nav = useNavigate();
  const recent = useRecentWorkouts(30);
  const draft = useMemo(() => loadDraft(uid), [uid]);
  const inProgress = !!draft && draft.exercises.length > 0;
  const toast = useToast();
  const catalog = useExerciseCatalog();
  const templates = useTemplates();
  const [editing, setEditing] = useState<{ tpl: WorkoutTemplate; isNew: boolean } | null>(null);
  const candidates = useMemo(() => templateCandidates(recent.data, templates.data), [recent.data, templates.data]);
  // Most recently used first, then alphabetical.
  const sortedTemplates = useMemo(
    () => [...templates.data].sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0) || a.name.localeCompare(b.name)),
    [templates.data],
  );

  const fromSession = async (w: Workout) => {
    try {
      await saveTemplate(uid, templateFromExercises(w.session ?? '', w.exercises, (id) => catalog.get(id)?.equipment));
      toast(t('templates.saved'), 'success');
    } catch (e) {
      toast(`${t('common.error')} (${(e as { code?: string }).code ?? (e as Error).message})`, 'error');
    }
  };

  const remove = (w: Workout) => {
    if (confirm(t('workouts.deleteConfirm'))) void deleteWorkout(uid, w.id);
  };

  return (
    <Screen title={t('nav.train')}>
      <button className="btn-accent w-full py-4 text-base" onClick={() => nav('/train/session')}>
        <Play size={20} /> {inProgress ? t('workouts.resume') : t('workouts.start')}
      </button>

      {/* Templates: start a planned session in one tap */}
      <div className="mt-6 mb-2 flex items-center justify-between">
        <h2 className="text-lg font-bold">{t('templates.title')}</h2>
        <button
          className="flex items-center gap-1 text-sm font-semibold text-brand"
          onClick={() => setEditing({ tpl: { id: newId(), name: '', exercises: [], createdAt: Date.now() }, isNew: true })}
        >
          <Plus size={16} /> {t('templates.new')}
        </button>
      </div>
      {sortedTemplates.length === 0 && candidates.length === 0 && !templates.loading && <Empty>{t('templates.empty')}</Empty>}
      {sortedTemplates.length > 0 && (
        <ul className="space-y-2">
          {sortedTemplates.map((tpl) => (
            <li key={tpl.id} className="card flex items-center gap-3 p-3">
              <button className="flex min-w-0 flex-1 items-center gap-3 text-start" onClick={() => nav(`/train/session?template=${tpl.id}`)}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-ink">
                  <Play size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{tpl.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {tpl.exercises.map((e) => exerciseName(catalog.get(e.exerciseId), i18n.language, e.name ?? e.exerciseId)).join(' · ')}
                  </span>
                  <span className="block text-xs text-muted">
                    {t('workouts.exercises', { count: tpl.exercises.length })} ·{' '}
                    {tpl.lastUsedAt ? t('templates.lastUsed', { date: formatDay(toKey(tpl.lastUsedAt), intlLocale()) }) : t('templates.neverUsed')}
                  </span>
                </span>
              </button>
              <button className="rounded-lg p-2 text-muted hover:bg-surface-2" onClick={() => setEditing({ tpl, isNew: false })} aria-label={t('templates.editTitle')}>
                <Pencil size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {candidates.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted">
            <ListChecks size={14} /> {t('templates.fromHistory')}
          </p>
          <div className="flex flex-wrap gap-2">
            {candidates.map((w) => (
              <button key={w.id} className="chip" onClick={() => void fromSession(w)}>
                <BookmarkPlus size={14} /> {w.session} <span className="text-muted">· {t('workouts.exercises', { count: w.exercises.length })}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Muscle-group shortcuts into the library */}
      <div className="mt-6 mb-2 flex items-center justify-between">
        <h2 className="text-lg font-bold">{t('workouts.library')}</h2>
        <Link to="/train/library" className="flex items-center gap-1 text-sm font-semibold text-brand">
          <BookOpen size={16} /> <ChevronRight size={16} className="flip-rtl" />
        </Link>
      </div>
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
        {MUSCLE_GROUPS.map((g) => (
          <Link key={g} to={`/train/library?g=${g}`} className="w-24 shrink-0 text-center">
            <img src={groupCover(g)} alt="" loading="lazy" className="aspect-square w-24 rounded-2xl border border-line bg-white object-cover" />
            <span className="mt-1 block truncate text-xs font-semibold">{t(`muscles.${g}`)}</span>
          </Link>
        ))}
      </div>

      <h2 className="mt-6 mb-2 text-lg font-bold">{t('workouts.recent')}</h2>
      {recent.loading ? (
        <Spinner />
      ) : recent.data.length === 0 ? (
        <Empty>{t('workouts.empty')}</Empty>
      ) : (
        <ul className="space-y-2">
          {recent.data.map((w) => {
            const setCount = w.exercises.reduce((n, e) => n + e.sets.length, 0);
            const names = w.exercises.map((e) => exerciseName(catalog.get(e.exerciseId), i18n.language, e.name ?? e.exerciseId)).join(' · ');
            return (
              <li key={w.id} className="card flex items-center gap-3 p-3">
                <Link to={`/train/session/${w.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                    <Dumbbell size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      {formatDay(w.date, intlLocale())}
                      {w.session && <span className="text-muted"> · {w.session}</span>}
                    </span>
                    <span className="block truncate text-xs text-muted">{names}</span>
                    <span className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                      {t('workouts.exercises', { count: w.exercises.length })} · {t('workouts.sets', { count: setCount })} ·
                      <span className="inline-flex items-center gap-0.5">
                        <Flame size={12} className="text-danger" />
                        <span className="num">{w.caloriesBurned}</span> {t('common.kcal')}
                      </span>
                    </span>
                  </span>
                </Link>
                <button className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger" onClick={() => remove(w)} aria-label={t('common.delete')}>
                  <Trash2 size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <TemplateEditor initial={editing?.tpl ?? null} isNew={editing?.isNew} onClose={() => setEditing(null)} />
    </Screen>
  );
}

const toKey = (ms: number) => toDateKey(new Date(ms));
