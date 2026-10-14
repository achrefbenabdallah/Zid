import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Gauge, Info, TriangleAlert } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { useSession } from '@/features/auth/AuthProvider';
import { updateProfile, useDaysBetween, useMealsBetween, useWeightLogs } from '@/services/data';
import {
  GOAL_RATES,
  MIN_LOGGED_DAYS,
  MIN_WEIGHT_SPAN_DAYS,
  MIN_WEIGH_INS,
  WINDOW_DAYS,
  computeAdaptive,
} from '@/lib/adaptive';
import { addDays, toDateKey } from '@/lib/dates';

const fmt = (n: number) => n.toLocaleString('en-US');
const signed = (n: number, digits = 2) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(n).toFixed(digits)}`;

/** "Adaptive calorie target": maintenance estimated from intake vs weight trend, with a recommendation. */
export function AdaptiveCard() {
  const { t } = useTranslation();
  const { uid, profile } = useSession();
  const toast = useToast();
  const today = toDateKey();
  const start = addDays(today, -(WINDOW_DAYS - 1));
  const meals = useMealsBetween(start, today);
  const days = useDaysBetween(start, today);
  const weights = useWeightLogs();
  const [busy, setBusy] = useState(false);
  const rate = profile.goalRateKgPerWeek;
  const g = profile.goals;

  const result = useMemo(() => {
    const perDay = new Map<string, number>();
    for (const m of meals.data) perDay.set(m.date, (perDay.get(m.date) ?? 0) + m.kcal);
    return computeAdaptive({
      today,
      intake: [...perDay].map(([date, kcal]) => ({ date, kcal })),
      weights: weights.data.map((w) => ({ date: w.date, kg: w.kg })),
      trainingDays: days.data.filter((d) => d.trainingDay).length,
      goalRateKgPerWeek: rate ?? 0,
      current: { kcal: g.kcal, kcalTraining: g.kcalTraining, protein: g.protein, fat: g.fat },
    });
  }, [meals.data, weights.data, days.data, rate, g, today]);

  const setRate = (r: number) => void updateProfile(uid, { goalRateKgPerWeek: r });

  const apply = async () => {
    if (result.status === 'needData') return;
    setBusy(true);
    try {
      const { kcal, kcalTraining, carbs } = result.recommended;
      await updateProfile(uid, { goals: { ...g, kcal, kcalTraining, carbs } });
      toast(t('adaptive.applied'), 'success');
    } finally {
      setBusy(false);
    }
  };

  const rateLabel = (r: number) =>
    r === 0 ? t('adaptive.maintain') : `${signed(r)} ${t('common.kg')}`;

  return (
    <section className="card space-y-3">
      <div className="flex items-start gap-2">
        <Gauge size={20} className="mt-0.5 shrink-0 text-brand" />
        <div>
          <h3 className="font-semibold">{t('adaptive.title')}</h3>
          <p className="text-xs text-muted">{t('adaptive.subtitle', { days: WINDOW_DAYS })}</p>
        </div>
      </div>

      {/* Goal: kg per week */}
      <div>
        <span className="label">{t('adaptive.goal')}</span>
        <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={t('adaptive.goal')}>
          {GOAL_RATES.map((r) => (
            <button
              key={r}
              role="radio"
              aria-checked={rate === r}
              className={`rounded-xl px-1 py-2 text-center text-[11px] leading-tight font-semibold ${rate === r ? 'bg-brand text-brand-ink' : 'bg-surface-2'}`}
              onClick={() => setRate(r)}
            >
              <span className="block">{t(`adaptive.rates.${String(r).replace('-', 'm').replace('.', '_')}`)}</span>
              <span className="num block opacity-80">{rateLabel(r)}</span>
            </button>
          ))}
        </div>
        {rate === undefined && <p className="mt-1 text-xs text-carbs">{t('adaptive.pickGoal')}</p>}
      </div>

      {result.status === 'needData' ? (
        <div className="space-y-2 rounded-xl bg-surface-2 p-3">
          <p className="text-sm font-medium">{t('adaptive.needData')}</p>
          {[
            [t('adaptive.loggedDays'), result.loggedDays, MIN_LOGGED_DAYS],
            [t('adaptive.weighIns'), result.weighIns, MIN_WEIGH_INS],
            [t('adaptive.weighSpan'), result.weightSpanDays, MIN_WEIGHT_SPAN_DAYS],
          ].map(([label, have, need]) => (
            <div key={label as string}>
              <div className="flex justify-between text-xs">
                <span>{label}</span>
                <span className="num text-muted">
                  {Math.min(have as number, need as number)} / {need}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(1, (have as number) / (need as number)) * 100}%` }} />
              </div>
            </div>
          ))}
          <p className="text-xs text-muted">{t('adaptive.needDataTip')}</p>
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-surface-2 p-2">
              <dt className="text-[11px] text-muted">{t('adaptive.avgIntake')}</dt>
              <dd className="num text-lg font-bold">{fmt(result.avgIntake)}</dd>
              <dd className="text-[11px] text-muted">{t('adaptive.overDays', { count: result.loggedDays })}</dd>
            </div>
            <div className="rounded-xl bg-surface-2 p-2">
              <dt className="text-[11px] text-muted">{t('adaptive.trend')}</dt>
              <dd className="num text-lg font-bold" dir="ltr">
                {signed(result.trendKgPerWeek)}
              </dd>
              <dd className="text-[11px] text-muted">
                {t('adaptive.perWeek')} · <span className="num">{signed(result.trendPctPerWeek, 1)}%</span>
              </dd>
            </div>
            <div className="rounded-xl bg-surface-2 p-2">
              <dt className="text-[11px] text-muted">{t('adaptive.maintenance')}</dt>
              <dd className="num text-lg font-bold">{fmt(result.tdee)}</dd>
              <dd className="text-[11px] text-muted">{t('common.kcal')}</dd>
            </div>
          </dl>

          {result.status === 'unreliable' ? (
            <p className="flex gap-2 rounded-xl bg-carbs/15 px-3 py-2 text-sm">
              <TriangleAlert size={16} className="mt-0.5 shrink-0 text-carbs" />
              {t('adaptive.unreliable', { tdee: fmt(result.tdee) })}
            </p>
          ) : rate === undefined ? null : Math.abs(result.delta) < 50 ? (
            <p className="flex gap-2 rounded-xl bg-brand/10 px-3 py-2 text-sm">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand" />
              {t('adaptive.onTarget')}
            </p>
          ) : (
            <div className="space-y-2 rounded-xl border border-brand/40 bg-brand/5 p-3">
              <p className="text-sm">
                {t('adaptive.recommend', {
                  rest: fmt(result.recommended.kcal),
                  training: fmt(result.recommended.kcalTraining),
                })}
              </p>
              <p className="text-xs text-muted">
                {t('adaptive.now', { rest: fmt(g.kcal), training: fmt(g.kcalTraining) })} ·{' '}
                {t('adaptive.carbsNote', { carbs: result.recommended.carbs, protein: g.protein, fat: g.fat })}
              </p>
              <button className="btn-primary w-full" disabled={busy} onClick={() => void apply()}>
                {t('adaptive.apply', { delta: signed(result.delta, 0) })}
              </button>
            </div>
          )}
          <p className="flex gap-1.5 text-[11px] text-muted">
            <Info size={12} className="mt-0.5 shrink-0" />
            {t('adaptive.howItWorks')}
          </p>
        </>
      )}
    </section>
  );
}
