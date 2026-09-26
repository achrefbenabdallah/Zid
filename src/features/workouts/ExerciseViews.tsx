import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Info, Plus, Search } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { EXERCISES, MUSCLE_GROUPS, exerciseImage, exerciseName } from '@/data/exercises';
import { matchesQuery } from '@/lib/foods';
import type { Exercise, MuscleGroup } from '@/types';

const EQUIPMENT_KEY: Record<string, string> = {
  barbell: 'barbell',
  dumbbell: 'dumbbell',
  cable: 'cable',
  machine: 'machine',
  'body only': 'bodyOnly',
  'e-z curl bar': 'ezBar',
  kettlebells: 'kettlebells',
};

export function useEquipmentLabel() {
  const { t } = useTranslation();
  return (eq: string) => t(`equipment.${EQUIPMENT_KEY[eq] ?? 'other'}`);
}

/** The dataset ships a start and end frame; flipping between them shows the movement. */
export function ExerciseAnimation({ exercise, className = '' }: { exercise: Exercise; className?: string }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (exercise.images.length < 2) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % exercise.images.length), 1000);
    return () => clearInterval(id);
  }, [exercise]);
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
  return (
    <img
      src={exerciseImage(exercise.images[0])}
      alt=""
      loading="lazy"
      width={size}
      height={size}
      className="shrink-0 rounded-xl bg-white object-cover"
      style={{ width: size, height: size }}
    />
  );
}

export function ExerciseDetail({ exercise, onClose, onAdd }: { exercise: Exercise | null; onClose: () => void; onAdd?: (e: Exercise) => void }) {
  const { t, i18n } = useTranslation();
  const eq = useEquipmentLabel();
  if (!exercise) return null;
  const ar = i18n.language === 'ar';
  return (
    <Sheet
      open
      onClose={onClose}
      title={exerciseName(exercise, i18n.language)}
      footer={
        onAdd && (
          <button className="btn-primary w-full" onClick={() => onAdd(exercise)}>
            <Plus size={18} /> {t('workouts.addExercise')}
          </button>
        )
      }
    >
      <ExerciseAnimation exercise={exercise} className="aspect-[4/3] w-full rounded-2xl" />
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="chip">{t(`muscles.${exercise.group}`)}</span>
        <span className="chip">{eq(exercise.equipment)}</span>
      </div>
      {ar && <p className="mt-2 text-sm text-muted" dir="ltr">{exercise.name}</p>}
      <h3 className="mt-4 mb-1 font-semibold">{t('workouts.howTo')}</h3>
      <p className="leading-relaxed">{ar ? exercise.howToAr : exercise.howTo}</p>
      <p className="mt-6 text-[11px] text-muted">{t('workouts.attribution')}</p>
    </Sheet>
  );
}

/** Group chips + search + list. Used by the library page and the "add exercise" picker. */
export function ExerciseBrowser({ onPick, selectedIds, initialGroup }: {
  onPick: (e: Exercise) => void;
  selectedIds?: Set<string>;
  initialGroup?: MuscleGroup | 'all';
}) {
  const { t, i18n } = useTranslation();
  const eq = useEquipmentLabel();
  const [group, setGroup] = useState<MuscleGroup | 'all'>(initialGroup ?? 'all');
  const [q, setQ] = useState('');
  const [info, setInfo] = useState<Exercise | null>(null);

  const list = useMemo(
    () => EXERCISES.filter((e) => (group === 'all' || e.group === group) && matchesQuery({ name: e.name, nameAr: e.nameAr }, q)),
    [group, q],
  );

  return (
    <div>
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
        <input type="search" className="input ps-10" placeholder={t('workouts.searchExercises')} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {(['all', ...MUSCLE_GROUPS] as const).map((g) => (
          <button key={g} className={group === g ? 'chip-active' : 'chip'} onClick={() => setGroup(g)}>
            {g === 'all' ? t('workouts.allGroups') : t(`muscles.${g}`)}
          </button>
        ))}
      </div>
      <ul className="mt-3 space-y-2">
        {list.map((e) => {
          const selected = selectedIds?.has(e.id);
          return (
            <li key={e.id} className="card flex items-center gap-3 p-2">
              <button className="flex min-w-0 flex-1 items-center gap-3 text-start" onClick={() => onPick(e)}>
                <ExerciseThumb exercise={e} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{exerciseName(e, i18n.language)}</span>
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
        onAdd={
          selectedIds
            ? (e) => {
                setInfo(null);
                onPick(e);
              }
            : undefined
        }
      />
    </div>
  );
}
