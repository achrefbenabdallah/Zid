import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Check, Dumbbell, History, Info, Pencil, Plus, Search } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { MUSCLE_GROUPS, exerciseImage, exerciseName } from '@/data/exercises';
import { matchesQuery } from '@/lib/foods';
import type { CustomExercise, Exercise, MuscleGroup } from '@/types';
import { CUSTOM_PREFIX, customToExercise, historyPath, useExerciseCatalog } from './useExerciseCatalog';
import { CustomExerciseForm, type CustomDraft } from './CustomExerciseForm';
import { useEquipmentLabel } from './equipment';

export { useEquipmentLabel };

function Placeholder({ className = '', size = 28 }: { className?: string; size?: number }) {
  return (
    <div className={`grid place-items-center bg-surface-2 text-muted ${className}`}>
      <Dumbbell size={size} />
    </div>
  );
}

/** Library exercises flip between a start and end frame; user exercises show their photo. */
export function ExerciseAnimation({ exercise, className = '' }: { exercise: Exercise; className?: string }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (exercise.images.length < 2) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % exercise.images.length), 1000);
    return () => clearInterval(id);
  }, [exercise]);
  if (exercise.photo) return <img src={exercise.photo} alt="" className={`bg-white object-cover ${className}`} />;
  if (!exercise.images.length) return <Placeholder className={className} size={48} />;
  return (
    <div className={`relative overflow-hidden bg-white ${className}`}>
      {exercise.images.map((src, i) => (
        <img
          key={src}
          src={exerciseImage(src)}
          alt=""
          loading="lazy"
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${i === frame ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
    </div>
  );
}

export function ExerciseThumb({ exercise, size = 56 }: { exercise: Exercise; size?: number }) {
  const src = exercise.photo ?? (exercise.images[0] ? exerciseImage(exercise.images[0]) : null);
  if (!src) return <Placeholder className="shrink-0 rounded-xl" size={size * 0.45} />;
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      width={size}
      height={size}
      className="shrink-0 rounded-xl bg-white object-cover"
      style={{ width: size, height: size }}
    />
  );
}

export function ExerciseDetail({ exercise, onClose, onAdd, onEdit, showHistory = true }: {
  exercise: Exercise | null;
  onClose: () => void;
  onAdd?: (e: Exercise) => void;
  onEdit?: (e: Exercise) => void;
  /** Link to the exercise's history page (off on that page itself). */
  showHistory?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const eq = useEquipmentLabel();
  if (!exercise) return null;
  const ar = i18n.language === 'ar';
  const howTo = ar ? exercise.howToAr : exercise.howTo;
  return (
    <Sheet
      open
      onClose={onClose}
      title={exerciseName(exercise, i18n.language)}
      footer={
        (onAdd || (exercise.custom && onEdit)) && (
          <div className="flex gap-2">
            {exercise.custom && onEdit && (
              <button className="btn-ghost" onClick={() => onEdit(exercise)}>
                <Pencil size={16} /> {t('common.edit')}
              </button>
            )}
            {onAdd && (
              <button className="btn-primary flex-1" onClick={() => onAdd(exercise)}>
                <Plus size={18} /> {t('workouts.addExercise')}
              </button>
            )}
          </div>
        )
      }
    >
      <ExerciseAnimation exercise={exercise} className="aspect-[4/3] w-full rounded-2xl" />
      <div className="mt-3 flex flex-wrap gap-2">
        {exercise.custom && <span className="chip-active">{t('workouts.custom.mine')}</span>}
        <span className="chip">{t(`muscles.${exercise.group}`)}</span>
        <span className="chip">{eq(exercise.equipment)}</span>
        {showHistory && (
          <Link to={historyPath(exercise.id)} className="chip ms-auto text-brand">
            <History size={14} /> {t('history.open')}
          </Link>
        )}
      </div>
      {/* English name kept for gym talk; LTR text, aligned with the RTL column. */}
      {ar && !exercise.custom && <p className="mt-2 text-end text-sm text-muted" dir="ltr">{exercise.name}</p>}
      <h3 className="mt-4 mb-1 font-semibold">{t('workouts.howTo')}</h3>
      <p className="leading-relaxed whitespace-pre-line" dir="auto">
        {howTo || <span className="text-muted">{t('workouts.custom.noHowTo')}</span>}
      </p>
      {!exercise.custom && <p className="mt-6 text-[11px] text-muted">{t('workouts.attribution')}</p>}
    </Sheet>
  );
}

/** Group chips + search + list (yours first). Used by the library page and the "add exercise" picker. */
export function ExerciseBrowser({ onPick, selectedIds, initialGroup }: {
  onPick: (e: Exercise) => void;
  selectedIds?: Set<string>;
  initialGroup?: MuscleGroup | 'all';
}) {
  const { t, i18n } = useTranslation();
  const eq = useEquipmentLabel();
  const catalog = useExerciseCatalog();
  const [group, setGroup] = useState<MuscleGroup | 'all'>(initialGroup ?? 'all');
  const [q, setQ] = useState('');
  const [info, setInfo] = useState<Exercise | null>(null);
  const [form, setForm] = useState<CustomDraft | null>(null);
  const picking = !!selectedIds;

  const list = useMemo(
    () => catalog.all.filter((e) => (group === 'all' || e.group === group) && matchesQuery({ name: e.name, nameAr: e.nameAr }, q)),
    [catalog.all, group, q],
  );

  const openNew = () => setForm({ name: q.trim(), group: group === 'all' ? undefined : group });
  const openEdit = (e: Exercise) => {
    const raw = catalog.rawCustom.find((c) => CUSTOM_PREFIX + c.id === e.id);
    if (!raw) return;
    setInfo(null);
    setForm(raw);
  };
  const onSaved = (c: CustomExercise) => {
    // Creating from the workout picker adds the new exercise to the session right away.
    if (picking && !form?.id) onPick(customToExercise(c));
  };

  return (
    <div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
          <input type="search" className="input ps-10" placeholder={t('workouts.searchExercises')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="btn-primary shrink-0 px-3" onClick={openNew} aria-label={t('workouts.custom.new')}>
          <Plus size={18} /> <span className="hidden sm:inline">{t('workouts.custom.new')}</span>
        </button>
      </div>
      <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {(['all', ...MUSCLE_GROUPS] as const).map((g) => (
          <button key={g} className={group === g ? 'chip-active' : 'chip'} onClick={() => setGroup(g)}>
            {g === 'all' ? t('workouts.allGroups') : t(`muscles.${g}`)}
          </button>
        ))}
      </div>

      {list.length === 0 && (
        <button className="card mt-3 flex w-full items-center gap-3 border-dashed text-start" onClick={openNew}>
          <Plus size={20} className="text-brand" />
          <span className="text-sm font-semibold">{q.trim() ? t('workouts.custom.createNamed', { name: q.trim() }) : t('workouts.custom.new')}</span>
        </button>
      )}

      <ul className="mt-3 space-y-2">
        {list.map((e) => {
          const selected = selectedIds?.has(e.id);
          return (
            <li key={e.id} className="card flex items-center gap-3 p-2">
              <button className="flex min-w-0 flex-1 items-center gap-3 text-start" onClick={() => onPick(e)}>
                <ExerciseThumb exercise={e} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">{exerciseName(e, i18n.language)}</span>
                    {e.custom && <span className="shrink-0 rounded-full bg-brand/15 px-1.5 py-0.5 text-[10px] font-bold text-brand">{t('workouts.custom.mine')}</span>}
                  </span>
                  <span className="block text-xs text-muted">
                    {t(`muscles.${e.group}`)} · {eq(e.equipment)}
                  </span>
                </span>
                {selected && <Check size={18} className="text-brand" />}
              </button>
              <button className="rounded-full p-2 text-muted hover:bg-surface-2" onClick={() => setInfo(e)} aria-label={t('workouts.howTo')}>
                <Info size={18} />
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-center text-[11px] text-muted">{t('workouts.attribution')}</p>
      <ExerciseDetail
        exercise={info}
        onClose={() => setInfo(null)}
        onEdit={openEdit}
        onAdd={
          picking
            ? (e) => {
                setInfo(null);
                onPick(e);
              }
            : undefined
        }
      />
      <CustomExerciseForm initial={form} existing={catalog.rawCustom} onClose={() => setForm(null)} onSaved={onSaved} />
    </div>
  );
}
