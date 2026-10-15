import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Info, Trophy } from 'lucide-react';
import { Empty, Screen, Spinner } from '@/components/Screen';
import { useAllWorkouts } from '@/services/data';
import { exerciseName } from '@/data/exercises';
import { exerciseHistory } from '@/lib/training';
import { formatSets } from '@/lib/records';
import { formatDay } from '@/lib/dates';
import { intlLocale } from '@/i18n';
import { ChartCard, Stat, WeightLine } from '@/features/progress/charts';
import { ExerciseDetail, ExerciseThumb } from './ExerciseViews';
import { useExerciseCatalog } from './useExerciseCatalog';

type Metric = 'e1rm' | 'top' | 'volume';
const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 });

/** One exercise over time: best set, estimated 1RM trend, volume, PRs and every session. */
export default function ExerciseHistoryPage() {
  const { t, i18n } = useTranslation();
  const exerciseId = decodeURIComponent(useParams().id ?? '');
  const catalog = useExerciseCatalog();
  const workouts = useAllWorkouts();
  const [metric, setMetric] = useState<Metric>('e1rm');
  const [info, setInfo] = useState(false);
  const locale = intlLocale();
  const kg = t('common.kg');

  const exercise = catalog.get(exerciseId);
  const h = useMemo(() => exerciseHistory(workouts.data, exerciseId), [workouts.data, exerciseId]);
  const storedName = useMemo(
    () => workouts.data.flatMap((w) => w.exercises).find((e) => e.exerciseId === exerciseId && e.name)?.name,
    [workouts.data, exerciseId],
  );
  const name = exerciseName(exercise, i18n.language, storedName ?? exerciseId.replace(/^custom:/, ''));

  const chart = useMemo(
    () =>
      h.sessions
        .map((s) => ({
          date: s.date,
          label: formatDay(s.date, locale, { day: 'numeric', month: 'short' }),
          kg: metric === 'e1rm' ? s.best1rm : metric === 'top' ? s.top.kg : s.volume,
        }))
        // Sessions logged without a weight (bodyweight, or "light" from an import) can't be plotted.
        .filter((p) => p.kg > 0),
    [h.sessions, metric, locale],
  );
  const metricLabel = t(`history.metric.${metric}`);

  return (
    <Screen title={name} back>
      {workouts.loading && !workouts.data.length ? (
        <Spinner />
      ) : (
        <div className="space-y-3">
          {exercise && (
            <button className="card flex w-full items-center gap-3 p-3 text-start" onClick={() => setInfo(true)}>
              <ExerciseThumb exercise={exercise} size={56} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{t(`muscles.${exercise.group}`)}</span>
                <span className="block text-xs text-muted">{t('workouts.howTo')}</span>
              </span>
              <Info size={18} className="text-muted" />
            </button>
          )}

          {h.sessions.length === 0 ? (
            <Empty>{t('history.empty')}</Empty>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Stat
                  label={t('history.bestSet')}
                  value={
                    h.bestKg && h.bestKg.kg > 0 ? (
                      <span className="num">
                        {fmt(h.bestKg.kg)}×{h.bestKg.reps}
                      </span>
                    ) : (
                      '—'
                    )
                  }
                  sub={kg}
                />
                <Stat label={t('history.best1rm')} value={h.best1rm ? <span className="num">{fmt(h.best1rm)}</span> : '—'} sub={`${kg} · ${t('history.estimated')}`} />
                <Stat label={t('history.sessions')} value={<span className="num">{h.sessions.length}</span>} sub={t('workouts.sets', { count: h.totalSets })} />
                <Stat
                  label={t('history.last')}
                  value={<span className="text-lg">{formatDay(h.sessions[h.sessions.length - 1].date, locale, { day: 'numeric', month: 'short' })}</span>}
                  sub={<span className="num">{formatSets(h.sessions[h.sessions.length - 1].sets)}</span>}
                />
              </div>

              <ChartCard
                title={t('history.trend')}
                hint={t(`history.hint.${metric}`)}
                table={{
                  head: [t('progress.day'), `${metricLabel} (${kg})`],
                  rows: [...chart].reverse().map((p) => [p.label, fmt(p.kg)]),
                }}
              >
                <div className="mb-2 flex gap-1.5" dir={i18n.dir()}>
                  {(['e1rm', 'top', 'volume'] as Metric[]).map((m) => (
                    <button key={m} aria-pressed={metric === m} className={metric === m ? 'chip-active' : 'chip'} onClick={() => setMetric(m)}>
                      {t(`history.metric.${m}`)}
                    </button>
                  ))}
                </div>
                {chart.length >= 2 ? (
                  <WeightLine data={chart} color="var(--chart-weight)" unit={kg} valueLabel={metricLabel} />
                ) : (
                  <p className="py-8 text-center text-sm text-muted">{t('history.needTwo')}</p>
                )}
              </ChartCard>

              <section className="card p-0">
                <h3 className="flex items-center gap-2 px-4 pt-3 pb-2 font-semibold">
                  <Trophy size={18} className="text-carbs" /> {t('history.prs')}
                </h3>
                {h.prs.length === 0 ? (
                  <p className="px-4 pb-3 text-sm text-muted">{t('history.noPrs')}</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {h.prs.map((p) => (
                      <li key={p.workoutId} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">{formatDay(p.date, locale)}</span>
                          <span className="block text-xs text-muted">{p.kinds.map((k) => t(`history.prKind.${k}`)).join(' · ')}</span>
                        </span>
                        <span className="num text-sm font-semibold">
                          {fmt(p.set.kg)} {kg} × {p.set.reps}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="card p-0">
                <h3 className="px-4 pt-3 pb-2 font-semibold">{t('history.allSessions')}</h3>
                <ul className="divide-y divide-line">
                  {[...h.sessions].reverse().map((s) => (
                    <li key={s.workoutId}>
                      <Link to={`/train/session/${s.workoutId}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2/60">
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">{formatDay(s.date, locale)}</span>
                          <span className="num block truncate text-xs text-muted">{formatSets(s.sets)}</span>
                        </span>
                        <span className="text-end text-xs text-muted">
                          <span className="num block font-semibold text-ink">{fmt(s.volume)} {kg}</span>
                          {t('history.metric.volume')}
                        </span>
                        <ChevronRight size={16} className="flip-rtl shrink-0 text-muted" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </div>
      )}
      <ExerciseDetail exercise={info && exercise ? exercise : null} onClose={() => setInfo(false)} showHistory={false} />
    </Screen>
  );
}
