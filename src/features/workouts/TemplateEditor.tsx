import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { NumberField } from '@/components/NumberField';
import { useToast } from '@/components/Toast';
import { useSession } from '@/features/auth/AuthProvider';
import { deleteTemplate, saveTemplate } from '@/services/data';
import { exerciseName } from '@/data/exercises';
import { defaultStepKg } from '@/lib/progression';
import type { Exercise, TemplateExercise, WorkoutTemplate } from '@/types';
import { ExerciseBrowser, ExerciseThumb } from './ExerciseViews';
import { useExerciseCatalog } from './useExerciseCatalog';

const STEPS = [0, 1, 1.25, 2, 2.5, 4, 5, 10];

/** Create / edit / delete a template. `initial` without a saved doc is a new template. */
export function TemplateEditor({ initial, isNew, onClose, onSaved }: {
  initial: WorkoutTemplate | null;
  isNew?: boolean;
  onClose: () => void;
  onSaved?: (tpl: WorkoutTemplate) => void;
}) {
  const { t, i18n } = useTranslation();
  const { uid } = useSession();
  const toast = useToast();
  const catalog = useExerciseCatalog();
  const [tpl, setTpl] = useState<WorkoutTemplate | null>(null);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => setTpl(initial ? structuredClone(initial) : null), [initial]);
  if (!tpl) return null;

  const setEx = (i: number, patch: Partial<TemplateExercise>) =>
    setTpl({ ...tpl, exercises: tpl.exercises.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
  const move = (i: number, d: -1 | 1) => {
    const ex = [...tpl.exercises];
    [ex[i], ex[i + d]] = [ex[i + d], ex[i]];
    setTpl({ ...tpl, exercises: ex });
  };
  const add = (e: Exercise) => {
    setTpl({
      ...tpl,
      exercises: [...tpl.exercises, { exerciseId: e.id, ...(e.custom ? { name: e.name } : {}), sets: 3, repMin: 8, repMax: 12, stepKg: defaultStepKg(e.equipment) }],
    });
    setPicker(false);
  };

  const save = async () => {
    setBusy(true);
    try {
      const clean = {
        ...tpl,
        name: tpl.name.trim(),
        exercises: tpl.exercises.map((e) => ({ ...e, repMax: Math.max(e.repMin, e.repMax), sets: Math.max(1, Math.round(e.sets)) })),
      };
      await saveTemplate(uid, clean);
      onSaved?.(clean);
      toast(t('templates.saved'), 'success');
      onClose();
    } catch (e) {
      toast(`${t('common.error')} (${(e as { code?: string }).code ?? (e as Error).message})`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(t('templates.deleteConfirm'))) return;
    await deleteTemplate(uid, tpl.id);
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={isNew ? t('templates.saveAsTemplate') : t('templates.editTitle')}
      footer={
        <div className="flex gap-2">
          {!isNew && (
            <button className="btn-danger" onClick={() => void remove()} aria-label={t('common.delete')}>
              <Trash2 size={18} />
            </button>
          )}
          <button className="btn-primary flex-1" disabled={busy || !tpl.name.trim() || !tpl.exercises.length} onClick={() => void save()}>
            {t('common.save')}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="tpl-name">{t('templates.name')}</label>
          <input
            id="tpl-name"
            className="input"
            value={tpl.name}
            maxLength={60}
            placeholder={t('templates.namePlaceholder')}
            onChange={(e) => setTpl({ ...tpl, name: e.target.value })}
          />
        </div>

        <p className="text-xs text-muted">{t('templates.progressionHint')}</p>

        <ul className="space-y-2">
          {tpl.exercises.map((te, i) => {
            const e = catalog.get(te.exerciseId);
            return (
              <li key={`${te.exerciseId}-${i}`} className="rounded-2xl border border-line p-3">
                <div className="flex items-center gap-2">
                  {e && <ExerciseThumb exercise={e} size={40} />}
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{exerciseName(e, i18n.language, te.name ?? te.exerciseId)}</span>
                  <button className="rounded-lg p-1.5 text-muted disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t('templates.moveUp')}>
                    <ArrowUp size={16} />
                  </button>
                  <button
                    className="rounded-lg p-1.5 text-muted disabled:opacity-30"
                    disabled={i === tpl.exercises.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label={t('templates.moveDown')}
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    className="rounded-lg p-1.5 text-muted hover:text-danger"
                    onClick={() => setTpl({ ...tpl, exercises: tpl.exercises.filter((_, j) => j !== i) })}
                    aria-label={t('workouts.removeExercise')}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  <NumberField label={t('templates.sets')} value={te.sets} onChange={(v) => setEx(i, { sets: v })} />
                  <NumberField label={t('templates.repMin')} value={te.repMin} onChange={(v) => setEx(i, { repMin: Math.round(v) })} />
                  <NumberField label={t('templates.repMax')} value={te.repMax} onChange={(v) => setEx(i, { repMax: Math.round(v) })} />
                  <div>
                    <label className="label">{t('templates.step')}</label>
                    <select className="input num px-2" value={te.stepKg} onChange={(ev) => setEx(i, { stepKg: Number(ev.target.value) })}>
                      {STEPS.map((s) => (
                        <option key={s} value={s}>
                          {s ? `+${s}` : '—'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <button className="btn-ghost w-full border border-dashed border-line" onClick={() => setPicker(true)}>
          <Plus size={16} /> {t('workouts.addExercise')}
        </button>
      </div>

      <Sheet open={picker} onClose={() => setPicker(false)} title={t('workouts.addExercise')}>
        <ExerciseBrowser onPick={add} selectedIds={new Set(tpl.exercises.map((e) => e.exerciseId))} />
      </Sheet>
    </Sheet>
  );
}
