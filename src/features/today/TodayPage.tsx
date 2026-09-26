import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Copy, Dumbbell, Flame, GlassWater, Minus, Plus } from 'lucide-react';
import { Screen, Empty } from '@/components/Screen';
import { MacroBar, ProgressRing } from '@/components/ProgressRing';
import { useToast } from '@/components/Toast';
import { useSession } from '@/features/auth/AuthProvider';
import {
  addWater,
  copyMealEntries,
  setTrainingDay,
  setWater,
  useDayLog,
  useDaysBetween,
  useMealsOn,
  useWorkoutsBetween,
} from '@/services/data';
import { getDocs, query, where } from 'firebase/firestore';
import { ref } from '@/services/data';
import { addDays, formatDay, toDateKey } from '@/lib/dates';
import { sumMacros } from '@/lib/macros';
import { computeStreak } from '@/lib/streak';
import { intlLocale } from '@/i18n';
import { MEAL_TYPES, type MealEntry } from '@/types';
import { MacroLine } from '@/features/meals/MacroLine';
import { EntrySheet } from '@/features/meals/EntrySheet';

export function TodayPage() {
  const { t, i18n } = useTranslation();
  const { uid, profile } = useSession();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const today = toDateKey();
  const date = params.get('d') ?? today;
  const isToday = date === today;
  const [editing, setEditing] = useState<MealEntry | null>(null);

  const meals = useMealsOn(date);
  const day = useDayLog(date);
  const workouts = useWorkoutsBetween(date, date);
  const history = useDaysBetween(addDays(today, -366), today);

  const totals = useMemo(() => sumMacros(meals.data), [meals.data]);
  const training = day.data?.trainingDay ?? false;
  const goals = profile.goals;
  const kcalGoal = training ? goals.kcalTraining : goals.kcal;
  const burned = workouts.data.reduce((s, w) => s + (w.caloriesBurned ?? 0), 0);
  const water = day.data?.waterMl ?? 0;
  const remaining = kcalGoal - totals.kcal;

  const streak = useMemo(
    () => computeStreak(new Set(history.data.filter((d) => (d.mealCount ?? 0) > 0).map((d) => d.date)), today),
    [history.data, today],
  );

  const grouped = useMemo(() => {
    const m = new Map<string, MealEntry[]>();
    for (const e of meals.data) m.set(e.mealType, [...(m.get(e.mealType) ?? []), e]);
    return MEAL_TYPES.filter((mt) => m.has(mt)).map((mt) => ({ type: mt, items: m.get(mt)! }));
  }, [meals.data]);

  const goDay = (n: number) => {
    const next = addDays(date, n);
    if (next > today) return;
    setParams(next === today ? {} : { d: next }, { replace: true });
  };

  const copyYesterday = async () => {
    const snap = await getDocs(query(ref.meals(uid), where('date', '==', addDays(date, -1))));
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MealEntry);
    if (!items.length) return toast(t('today.nothingYesterday'));
    await copyMealEntries(uid, items, date);
    toast(t('today.copiedYesterday', { count: items.length }), 'success');
  };

  const locale = intlLocale();
  const title = isToday ? t('today.greeting', { name: profile.displayName || '' }).trim() : formatDay(date, locale);

  return (
    <Screen title={title}>
      {/* Day switcher + streak */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex shrink-0 items-center gap-1 rounded-full border border-line bg-surface p-1">
          <button className="rounded-full p-1.5 hover:bg-surface-2" onClick={() => goDay(-1)} aria-label={t('today.prevDay')}>
            <ChevronLeft size={18} className="flip-rtl" />
          </button>
          <span className="min-w-24 text-center text-sm font-semibold">
            {isToday ? t('common.today') : date === addDays(today, -1) ? t('common.yesterday') : formatDay(date, locale, { day: 'numeric', month: 'short' })}
          </span>
          <button className="rounded-full p-1.5 hover:bg-surface-2 disabled:opacity-30" onClick={() => goDay(1)} disabled={isToday} aria-label={t('today.nextDay')}>
            <ChevronRight size={18} className="flip-rtl" />
          </button>
        </div>
        <span className="chip min-w-0 border-transparent bg-carbs/15 text-ink" key={i18n.language}>
          <Flame size={16} className="shrink-0 text-carbs" />
          <span className="truncate">{streak > 0 ? t('today.streak', { count: streak }) : t('today.noStreak')}</span>
        </span>
      </div>

      {/* Calories ring */}
      <section className="card flex items-center gap-5">
        <ProgressRing value={totals.kcal} max={kcalGoal} size={132} stroke={13} color="var(--kcal)">
          <div>
            <div className="num text-3xl font-extrabold">{Math.abs(remaining)}</div>
            <div className="text-[11px] font-medium text-muted">{remaining >= 0 ? t('today.leftLabel') : t('today.overLabel')}</div>
          </div>
        </ProgressRing>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <div className="text-xs text-muted">{t('macros.kcal')}</div>
            <div className="text-lg font-bold">
              <span className="num">{totals.kcal}</span> <span className="text-sm font-medium text-muted">{t('today.of', { goal: kcalGoal })}</span>
            </div>
          </div>
          <button
            onClick={() => void setTrainingDay(uid, date, !training)}
            className={training ? 'chip-active' : 'chip'}
            title={t('today.trainingDayHint')}
          >
            <Dumbbell size={14} />
            {training ? t('today.trainingDay') : t('today.restDay')}
          </button>
          {burned > 0 && (
            <div className="text-xs text-muted">
              <Flame size={12} className="me-1 inline text-danger" />
              {t('today.burned', { kcal: burned })}
            </div>
          )}
        </div>
      </section>

      {/* Macro bars */}
      <section className="card mt-3 space-y-3">
        <MacroBar label={t('macros.protein')} value={totals.protein} goal={goals.protein} color="var(--protein)" unit={t('common.g')} />
        <MacroBar label={t('macros.carbs')} value={totals.carbs} goal={goals.carbs} color="var(--carbs)" unit={t('common.g')} />
        <MacroBar label={t('macros.fat')} value={totals.fat} goal={goals.fat} color="var(--fat)" unit={t('common.g')} />
      </section>

      {/* Water */}
      <section className="card mt-3">
        <div className="flex items-center gap-3">
          <GlassWater className="text-water" size={22} />
          <div className="flex-1">
            <div className="text-sm font-semibold">{t('today.water')}</div>
            <div className="text-xs text-muted">
              <span className="num">{water}</span> / <span className="num">{goals.waterMl}</span> {t('common.ml')}
            </div>
          </div>
          <button className="btn-ghost px-3" onClick={() => void setWater(uid, date, water - 250)} aria-label={'-250 ' + t('common.ml')} disabled={water <= 0}>
            <Minus size={16} />
          </button>
          <button className="btn-ghost px-3" onClick={() => void addWater(uid, date, 250)}>
            <Plus size={16} /> <span className="num">250</span>
          </button>
        </div>
        <div className="mt-3 flex gap-1">
          {Array.from({ length: Math.max(1, Math.round(goals.waterMl / 250)) }).map((_, i) => (
            <div key={i} className={`h-2 flex-1 rounded-full ${i < Math.round(water / 250) ? 'bg-water' : 'bg-surface-2'}`} />
          ))}
        </div>
      </section>

      {/* Meals */}
      <div className="mt-6 mb-2 flex items-center justify-between">
        <h2 className="text-lg font-bold">{t('nav.food')}</h2>
        {meals.data.length === 0 && !meals.loading && (
          <button className="btn-ghost py-1.5" onClick={copyYesterday}>
            <Copy size={14} /> {t('today.copyYesterday')}
          </button>
        )}
      </div>

      {meals.data.length === 0 && !meals.loading ? (
        <Empty>{t('today.empty')}</Empty>
      ) : (
        <div className="space-y-3">
          {grouped.map(({ type, items }) => {
            const sub = sumMacros(items);
            return (
              <section key={type} className="card p-0">
                <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                  <h3 className="font-semibold">{t(`mealTypes.${type}`)}</h3>
                  <span className="text-sm font-semibold text-muted">
                    <span className="num">{sub.kcal}</span> {t('common.kcal')}
                  </span>
                </div>
                <ul>
                  {items.map((e) => (
                    <li key={e.id}>
                      <button onClick={() => setEditing(e)} className="flex w-full items-center gap-3 px-4 py-2.5 text-start hover:bg-surface-2/60">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{e.foodName}</div>
                          <MacroLine m={e} />
                        </div>
                        <span className="num shrink-0 text-xs text-muted">
                          {e.grams} {t('common.g')}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <Link to={`/meal/new${isToday ? '' : `?d=${date}`}`} className="btn-primary mt-4 w-full py-3">
        <Plus size={18} /> {t('meals.addMeal')}
      </Link>

      <EntrySheet entry={editing} onClose={() => setEditing(null)} />
    </Screen>
  );
}
