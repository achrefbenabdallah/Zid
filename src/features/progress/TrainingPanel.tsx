import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, History } from 'lucide-react';
import { Empty, Spinner } from '@/components/Screen';
import { useAllWorkouts } from '@/services/data';
import { MUSCLE_GROUPS, exerciseName } from '@/data/exercises';
import { addDays, formatDay, toDateKey } from '@/lib/dates';
import { validSets } from '@/lib/records';
import { doneExercises, setTarget, setsPerMuscle, volumeStatus, weekStart, type VolumeStatus } from '@/lib/training';
import { daysBetween } from '@/lib/weighIn';
import { intlLocale } from '@/i18n';
import type { MuscleGroup } from '@/types';
import { historyPath, useExerciseCatalog } from '@/features/workouts/useExerciseCatalog';
import { BodyMap } from './BodyMap';

const BAR: Record<VolumeStatus, string> = {
  none: 'bg-surface-2',
  low: 'bg-carbs',
  good: 'bg-kcal',
  high: 'bg-water',
};

/** Weekly sets per muscle (with a body map) and the list of exercises you've trained. */
export function TrainingPanel() {
  const { t, i18n } = useTranslation();
  const workouts = useAllWorkouts();
  const catalog = useExerciseCatalog();
  const locale = intlLocale();
  const today = toDateKey();
  const [weeksBack, setWeeksBack] = useState(0);
  const [selected, setSelected] = useState<MuscleGroup | null>(null);
  const [showAll, setShowAll] = useState(false);

  const start = addDays(weekStart(today), -7 * weeksBack);
  const end = addDays(start, 6);
  const groupOf = (id: string) => catalog.get(id)?.group;

  const week = useMemo(() => setsPerMuscle(workouts.data, groupOf, start, end), [workouts.data, catalog, start, end]); // eslint-disable-line react-hooks/exhaustive-deps
  // Average of the 4 full weeks before this one — is this week normal for you?
  const avg4 = useMemo(() => setsPerMuscle(workouts.data, groupOf, addDays(start, -28), addDays(start, -1)), [workouts.data, catalog, start]); // eslint-disable-line react-hooks/exhaustive-deps
  const done = useMemo(() => doneExercises(workouts.data), [workouts.data]);

  const sets = (g: MuscleGroup) => week.sets.get(g) ?? 0;
  const status = (g: MuscleGroup) => volumeStatus(g, sets(g));
  const total = [...week.sets.values()].reduce((a, b) => a + b, 0) + week.unassigned;
  const daysLeft = weeksBack === 0 ? 6 - daysBetween(start, today) : 0;
  const low = MUSCLE_GROUPS.filter((g) => ['none', 'low'].includes(status(g)) && setTarget(g)[0] >= 10);

  // What made up the selected muscle's sets this week.
  const breakdown = useMemo(() => {
    if (!selected) return [];
    const m = new Map<string, { name: string; sets: number }>();
    for (const w of workouts.data) {
      if (w.date < start || w.date > end) continue;
      for (const e of w.exercises) {
        if (catalog.get(e.exerciseId)?.group !== selected) continue;
        const n = validSets(e.sets).length;
        if (!n) continue;
        const name = exerciseName(catalog.get(e.exerciseId), i18n.language, e.name ?? e.exerciseId);
        m.set(e.exerciseId, { name, sets: (m.get(e.exerciseId)?.sets ?? 0) + n });
      }
    }
    return [...m.values()].sort((a, b) => b.sets - a.sets);
  }, [selected, workouts.data, catalog, start, end, i18n.language]);

  if (workouts.loading && !workouts.data.length) return <Spinner />;
  if (!workouts.data.length) return <Empty>{t('workouts.empty')}</Empty>;

  const weekLabel =
    weeksBack === 0
      ? t('volume.thisWeek')
      : weeksBack === 1
        ? t('volume.lastWeek')
        : `${formatDay(start, locale, { day: 'numeric', month: 'short' })} – ${formatDay(end, locale, { day: 'numeric', month: 'short' })}`;

  return (
    <div className="space-y-3">
      <section className="card space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">{t('volume.title')}</h3>
            <p className="text-xs text-muted">
              {t('workouts.sets', { count: total })}
              {daysLeft > 0 && ` · ${t('volume.daysLeft', { count: daysLeft })}`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-full border border-line p-1">
            <button className="rounded-full p-1.5 hover:bg-surface-2" onClick={() => setWeeksBack(weeksBack + 1)} aria-label={t('volume.prevWeek')}>
              <ChevronLeft size={16} className="flip-rtl" />
            </button>
            <span className="min-w-20 text-center text-xs font-semibold">{weekLabel}</span>
            <button className="rounded-full p-1.5 hover:bg-surface-2 disabled:opacity-30" disabled={weeksBack === 0} onClick={() => setWeeksBack(weeksBack - 1)} aria-label={t('volume.nextWeek')}>
              <ChevronRight size={16} className="flip-rtl" />
            </button>
          </div>
        </div>

        <BodyMap status={status} selected={selected} onSelect={(g) => setSelected(selected === g ? null : g)} />

        {selected && (
          <div className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
            <span className="font-semibold">{t(`muscles.${selected}`)}</span> · <span className="num">{sets(selected)}</span> / {setTarget(selected).join('–')}
            {breakdown.length > 0 ? (
              <ul className="mt-1 text-xs text-muted">
                {breakdown.map((b) => (
                  <li key={b.name}>
                    {b.name} · <span className="num">{b.sets}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-muted">{t('volume.noneThisWeek')}</p>
            )}
          </div>
        )}

        {weeksBack === 0 && low.length > 0 && total > 0 && (
          <p className="rounded-xl bg-carbs/15 px-3 py-2 text-xs">
            {t('volume.lowList', { muscles: low.map((g) => t(`muscles.${g}`)).join(i18n.language === 'ar' ? '، ' : ', ') })}
          </p>
        )}

        <ul className="space-y-2">
          {MUSCLE_GROUPS.map((g) => {
            const n = sets(g);
            const [min, max] = setTarget(g);
            const scale = Math.max(max + 4, n);
            const prev = Math.round(((avg4.sets.get(g) ?? 0) / 4) * 10) / 10;
            return (
              <li key={g}>
                <button className="w-full text-start" onClick={() => setSelected(selected === g ? null : g)} aria-pressed={selected === g}>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className={selected === g ? 'font-bold' : 'font-medium'}>{t(`muscles.${g}`)}</span>
                    <span className="text-muted">
                      <span className="num font-semibold text-ink">{n}</span> / {min}–{max}
                      <span className="ms-2">{t('volume.avg', { n: prev })}</span>
                    </span>
                  </div>
                  <div className="relative mt-1 h-2 rounded-full bg-surface-2" dir="ltr">
                    {/* Target band */}
                    <div className="absolute inset-y-0 rounded-full bg-kcal/20" style={{ left: `${(min / scale) * 100}%`, width: `${((max - min) / scale) * 100}%` }} />
                    <div className={`absolute inset-y-0 left-0 rounded-full ${BAR[status(g)]}`} style={{ width: `${Math.min(100, (n / scale) * 100)}%` }} />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
        {week.unassigned > 0 && <p className="text-xs text-muted">{t('volume.unassigned', { count: week.unassigned })}</p>}
        <p className="text-xs text-muted">{t('volume.hint')}</p>
      </section>

      <section className="card p-0">
        <h3 className="flex items-center gap-2 px-4 pt-3 pb-2 font-semibold">
          <History size={18} className="text-brand" /> {t('history.yourExercises')}
        </h3>
        <ul className="divide-y divide-line">
          {(showAll ? done : done.slice(0, 8)).map((d) => (
            <li key={d.exerciseId}>
              <Link to={historyPath(d.exerciseId)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2/60">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {exerciseName(catalog.get(d.exerciseId), i18n.language, d.name ?? d.exerciseId.replace(/^custom:/, ''))}
                  </span>
                  <span className="block text-xs text-muted">
                    {t('history.sessionsCount', { count: d.sessions })} · {formatDay(d.lastDate, locale, { day: 'numeric', month: 'short' })}
                  </span>
                </span>
                <ChevronRight size={16} className="flip-rtl shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
        {done.length > 8 && (
          <button className="w-full border-t border-line py-2.5 text-sm font-semibold text-brand" onClick={() => setShowAll(!showAll)}>
            {showAll ? t('volume.showLess') : t('volume.showAll', { count: done.length })}
          </button>
        )}
      </section>
    </div>
  );
}
