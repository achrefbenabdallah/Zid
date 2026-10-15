import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Screen, Spinner } from '@/components/Screen';
import { useSession } from '@/features/auth/AuthProvider';
import { useDaysBetween, useMealsBetween, useWorkoutsBetween } from '@/services/data';
import { addDays, dayRange, formatDay, toDateKey } from '@/lib/dates';
import { intlLocale } from '@/i18n';
import { BodyPanel } from '@/features/body/BodyPanel';
import { ChartCard, DailyBars, Stat, type DailyPoint } from './charts';
import { AdaptiveCard } from './AdaptiveCard';
import { TrainingPanel } from './TrainingPanel';
import { WeeklySummaryCard } from './WeeklySummaryCard';

type Tab = 'nutrition' | 'training' | 'body';
const TABS: Tab[] = ['nutrition', 'training', 'body'];
type Range = 7 | 30;

export default function ProgressPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.find((k) => k === params.get('tab')) ?? 'nutrition';
  const range: Range = params.get('r') === '30' ? 30 : 7;
  const today = toDateKey();
  const start = addDays(today, -(range - 1));

  const set = (next: Partial<{ tab: Tab; r: Range }>) => {
    const p = { tab, r: String(range), ...Object.fromEntries(Object.entries(next).map(([k, v]) => [k, String(v)])) };
    setParams(p, { replace: true });
  };

  return (
    <Screen title={t('nav.progress')}>
      {/* Filters: one row above the charts */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-xl bg-surface-2 p-1" role="tablist">
          {TABS.map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap ${tab === k ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
              onClick={() => set({ tab: k })}
            >
              {t(`progress.${k}`)}
            </button>
          ))}
        </div>
        {/* Training has its own week switcher. */}
        <div className={`inline-flex rounded-xl bg-surface-2 p-1 ${tab === 'training' ? 'hidden' : ''}`}>
          {([7, 30] as Range[]).map((r) => (
            <button
              key={r}
              aria-pressed={range === r}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap ${range === r ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
              onClick={() => set({ r })}
            >
              {r === 7 ? t('progress.week') : t('progress.month')}
            </button>
          ))}
        </div>
      </div>

      {tab === 'nutrition' ? (
        <NutritionPanel start={start} end={today} range={range} />
      ) : tab === 'training' ? (
        <TrainingPanel />
      ) : (
        <BodyPanel rangeStart={range === 7 ? addDays(today, -29) : addDays(today, -179)} />
      )}
    </Screen>
  );
}

function NutritionPanel({ start, end, range }: { start: string; end: string; range: Range }) {
  const { t } = useTranslation();
  const { profile } = useSession();
  const meals = useMealsBetween(start, end);
  const days = useDaysBetween(start, end);
  const workouts = useWorkoutsBetween(start, end);
  const locale = intlLocale();
  const goals = profile.goals;

  const series = useMemo(() => {
    const byDay = new Map<string, { kcal: number; protein: number }>();
    for (const e of meals.data) {
      const d = byDay.get(e.date) ?? { kcal: 0, protein: 0 };
      d.kcal += e.kcal;
      d.protein += e.protein;
      byDay.set(e.date, d);
    }
    const training = new Set(days.data.filter((d) => d.trainingDay).map((d) => d.date));
    const burnedByDay = new Map<string, number>();
    for (const w of workouts.data) burnedByDay.set(w.date, (burnedByDay.get(w.date) ?? 0) + (w.caloriesBurned ?? 0));

    const label = (date: string) =>
      range === 7 ? formatDay(date, locale, { weekday: 'short' }) : formatDay(date, locale, { day: 'numeric', month: 'numeric' });

    const kcal: DailyPoint[] = [];
    const protein: DailyPoint[] = [];
    const burned: DailyPoint[] = [];
    for (const date of dayRange(start, end)) {
      const d = byDay.get(date);
      const l = label(date);
      kcal.push({ date, label: l, value: Math.round(d?.kcal ?? 0), goal: training.has(date) ? goals.kcalTraining : goals.kcal });
      protein.push({ date, label: l, value: Math.round(d?.protein ?? 0), goal: goals.protein });
      burned.push({ date, label: l, value: burnedByDay.get(date) ?? 0 });
    }
    const logged = kcal.filter((p) => p.value > 0);
    return {
      kcal,
      protein,
      burned,
      loggedDays: logged.length,
      // Averages over days with food logged, so an unlogged day doesn't read as fasting.
      avgKcal: logged.length ? Math.round(logged.reduce((s, p) => s + p.value, 0) / logged.length) : 0,
      avgProtein: logged.length ? Math.round(protein.filter((_, i) => kcal[i].value > 0).reduce((s, p) => s + p.value, 0) / logged.length) : 0,
    };
  }, [meals.data, days.data, workouts.data, start, end, range, locale, goals]);

  if (meals.loading && !meals.data.length) return <Spinner />;

  const kcalUnit = t('common.kcal');
  const g = t('common.g');
  const tableOf = (pts: DailyPoint[], unit: string, withGoal: boolean) => ({
    head: [t('progress.day'), unit, ...(withGoal ? [t('progress.goal')] : [])],
    rows: pts.map((p) => [formatDay(p.date, locale), p.value.toLocaleString('en-US'), ...(withGoal ? [p.goal?.toLocaleString('en-US') ?? ''] : [])]),
  });

  return (
    <div className="space-y-3">
      <WeeklySummaryCard />
      <AdaptiveCard />
      <div className="grid grid-cols-2 gap-3">
        <Stat label={t('progress.avgKcal')} value={series.avgKcal.toLocaleString('en-US')} sub={`${t('progress.goal')} ${goals.kcal.toLocaleString('en-US')}`} />
        <Stat label={t('progress.avgProtein')} value={`${series.avgProtein} ${g}`} sub={`${t('progress.goal')} ${goals.protein} ${g}`} />
        <Stat label={t('progress.daysLogged')} value={`${series.loggedDays} / ${range}`} />
        <Stat label={t('progress.workouts')} value={workouts.data.length} />
      </div>

      <ChartCard title={t('progress.caloriesPerDay')} hint={t('progress.caloriesHint')} table={tableOf(series.kcal, kcalUnit, true)}>
        <DailyBars data={series.kcal} color="var(--chart-kcal)" unit={kcalUnit} valueLabel={t('macros.kcal')} showGoal />
      </ChartCard>

      <ChartCard title={t('progress.proteinPerDay')} table={tableOf(series.protein, g, true)}>
        <DailyBars data={series.protein} color="var(--chart-protein)" unit={g} valueLabel={t('macros.protein')} showGoal />
      </ChartCard>

      <ChartCard title={t('progress.burned')} hint={t('progress.burnedHint')} table={tableOf(series.burned.filter((p) => p.value > 0), kcalUnit, false)}>
        {series.burned.some((p) => p.value > 0) ? (
          <DailyBars data={series.burned} color="var(--chart-burned)" unit={kcalUnit} valueLabel={t('progress.burned')} height={150} />
        ) : (
          <p className="py-8 text-center text-sm text-muted">{t('progress.noData')}</p>
        )}
      </ChartCard>
    </div>
  );
}
