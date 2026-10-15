import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronLeft, ChevronRight, Lightbulb, RefreshCw, Sparkles, Target, X } from 'lucide-react';
import { useSession } from '@/features/auth/AuthProvider';
import { useExerciseCatalog } from '@/features/workouts/useExerciseCatalog';
import { exerciseName } from '@/data/exercises';
import { callAiFunction, VisionError } from '@/services/foodVision';
import { saveWeeklySummary, useAllWorkouts, useDaysBetween, useMealsBetween, useWeeklySummary, useWeightLogs } from '@/services/data';
import { addDays, formatDay, toDateKey } from '@/lib/dates';
import { weekStart as mondayOf } from '@/lib/training';
import { isEmptyWeek, weekStats } from '@/lib/weekly';
import { intlLocale } from '@/i18n';
import type { Lang, WeeklySummary } from '@/types';

const dismissKey = (week: string) => `zid.summaryDismissed.${week}`;
const isDismissed = (week: string) => {
  try {
    return !!localStorage.getItem(dismissKey(week));
  } catch {
    return false;
  }
};

/**
 * AI recap of a finished week (Mon–Sun). Generated on request, once, and stored — so it costs
 * one Gemini call per week. `variant="today"` shows last week early in the new week, dismissable.
 */
export function WeeklySummaryCard({ variant = 'progress' }: { variant?: 'today' | 'progress' }) {
  const { t, i18n } = useTranslation();
  const { uid, profile } = useSession();
  const today = toDateKey();
  const [weeksBack, setWeeksBack] = useState(1);
  const start = addDays(mondayOf(today), -7 * weeksBack);
  const end = addDays(start, 6);

  const summary = useWeeklySummary(start);
  const meals = useMealsBetween(addDays(start, -7), end);
  const days = useDaysBetween(addDays(start, -7), end);
  const workouts = useAllWorkouts();
  const weights = useWeightLogs();
  const catalog = useExerciseCatalog();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(() => variant === 'today' && isDismissed(start));

  const lang = (i18n.language === 'ar' ? 'ar' : 'en') as Lang;
  const stats = useMemo(
    () =>
      weekStats({
        weekStart: start,
        meals: meals.data,
        days: days.data,
        workouts: workouts.data,
        weights: weights.data,
        goals: profile.goals,
        goalRateKgPerWeek: profile.goalRateKgPerWeek,
        groupOf: (id) => catalog.get(id)?.group,
        exerciseName: (id, stored) => exerciseName(catalog.get(id), lang, stored ?? id.replace(/^custom:/, '')),
        muscleName: (g) => t(`muscles.${g}`),
      }),
    [start, meals.data, days.data, workouts.data, weights.data, profile.goals, profile.goalRateKgPerWeek, catalog, lang, t],
  );

  const loading = summary.loading || meals.loading || workouts.loading;
  const s = summary.data;
  const range = `${formatDay(start, intlLocale(), { day: 'numeric', month: 'short' })} – ${formatDay(end, intlLocale(), { day: 'numeric', month: 'short' })}`;

  if (variant === 'today' && (dismissed || loading || isEmptyWeek(stats))) return null;

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await callAiFunction<Pick<WeeklySummary, 'headline' | 'wins' | 'focus' | 'tip'>>('weekly-summary', { stats, lang });
      await saveWeeklySummary(uid, {
        weekStart: start,
        lang,
        headline: res.headline,
        wins: res.wins ?? [],
        focus: res.focus ?? [],
        tip: res.tip ?? '',
        createdAt: Date.now(),
      });
    } catch (e) {
      console.error(e);
      const code = (e as { code?: string }).code;
      setError(
        e instanceof VisionError && (e.status === 429 || e.status === 503)
          ? t('meals.busy')
          : code
            ? `${t('summary.failed')} (${code})`
            : t('summary.failed'),
      );
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    try {
      localStorage.setItem(dismissKey(start), '1');
    } catch {
      /* storage blocked */
    }
    setDismissed(true);
  };

  return (
    <section className={`card space-y-3 ${variant === 'today' ? 'mt-3' : ''}`}>
      <div className="flex items-start gap-2">
        <Sparkles size={18} className="mt-0.5 shrink-0 text-brand" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{t('summary.title')}</h3>
          <p className="text-xs text-muted">{range}</p>
        </div>
        {variant === 'progress' ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <button className="rounded-full p-1.5 hover:bg-surface-2" onClick={() => setWeeksBack(weeksBack + 1)} aria-label={t('volume.prevWeek')}>
              <ChevronLeft size={16} className="flip-rtl" />
            </button>
            <button className="rounded-full p-1.5 hover:bg-surface-2 disabled:opacity-30" disabled={weeksBack <= 1} onClick={() => setWeeksBack(weeksBack - 1)} aria-label={t('volume.nextWeek')}>
              <ChevronRight size={16} className="flip-rtl" />
            </button>
          </div>
        ) : (
          <button className="-me-1 -mt-1 rounded-full p-1.5 text-muted hover:bg-surface-2" onClick={dismiss} aria-label={t('common.close')}>
            <X size={16} />
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted">…</p>
      ) : s ? (
        <>
          <p className="font-semibold" dir="auto">{s.headline}</p>
          {s.wins.length > 0 && (
            <ul className="space-y-1.5 text-sm" dir="auto">
              {s.wins.map((w, i) => (
                <li key={i} className="flex gap-2">
                  <Check size={16} className="mt-0.5 shrink-0 text-kcal" /> <span>{w}</span>
                </li>
              ))}
            </ul>
          )}
          {s.focus.length > 0 && (
            <ul className="space-y-1.5 text-sm" dir="auto">
              {s.focus.map((f, i) => (
                <li key={i} className="flex gap-2">
                  <Target size={16} className="mt-0.5 shrink-0 text-carbs" /> <span>{f}</span>
                </li>
              ))}
            </ul>
          )}
          {s.tip && (
            <p className="flex gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm" dir="auto">
              <Lightbulb size={16} className="mt-0.5 shrink-0 text-brand" /> <span>{s.tip}</span>
            </p>
          )}
          <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
            <span>{t('summary.aiNote')}</span>
            <button className="inline-flex items-center gap-1 font-semibold text-brand disabled:opacity-50" disabled={busy} onClick={() => void generate()}>
              <RefreshCw size={12} className={busy ? 'animate-spin' : ''} /> {s.lang !== lang ? t('summary.inMyLanguage') : t('summary.regenerate')}
            </button>
          </div>
        </>
      ) : isEmptyWeek(stats) ? (
        <p className="text-sm text-muted">{t('summary.empty')}</p>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-surface-2 p-2">
              <dt className="text-[11px] text-muted">{t('progress.daysLogged')}</dt>
              <dd className="num text-lg font-bold">{stats.nutrition.daysLogged}/7</dd>
            </div>
            <div className="rounded-xl bg-surface-2 p-2">
              <dt className="text-[11px] text-muted">{t('progress.avgProtein')}</dt>
              <dd className="num text-lg font-bold">
                {stats.nutrition.avgProteinG} <span className="text-xs font-medium text-muted">{t('common.g')}</span>
              </dd>
            </div>
            <div className="rounded-xl bg-surface-2 p-2">
              <dt className="text-[11px] text-muted">{t('progress.workouts')}</dt>
              <dd className="num text-lg font-bold">{stats.training.sessions}</dd>
            </div>
          </dl>
          <button className="btn-primary w-full" disabled={busy} onClick={() => void generate()}>
            <Sparkles size={16} className={busy ? 'animate-pulse' : ''} /> {busy ? t('summary.writing') : t('summary.generate')}
          </button>
          <p className="text-[11px] text-muted">{t('summary.privacy')}</p>
        </>
      )}
      {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger" role="alert">{error}</p>}
    </section>
  );
}
