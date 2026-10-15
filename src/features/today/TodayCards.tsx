import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Beef, Bookmark, ChevronRight, Scale, X } from 'lucide-react';
import { NumberField } from '@/components/NumberField';
import { useToast } from '@/components/Toast';
import { useSession } from '@/features/auth/AuthProvider';
import { saveWeightLog, useFoods, useMealsBetween, useSavedMeals, useWeightLogs } from '@/services/data';
import { addDays } from '@/lib/dates';
import { foodLabel } from '@/lib/foods';
import { proteinIdeas } from '@/lib/protein';
import { weighInStatus } from '@/lib/weighIn';

/** "33 g protein left → 110 g chicken breast": closes the gap with foods you already log. */
export function ProteinIdeasCard({ date, proteinLeft, kcalLeft }: { date: string; proteinLeft: number; kcalLeft: number }) {
  const { t, i18n } = useTranslation();
  const foods = useFoods();
  const saved = useSavedMeals();
  const recent = useMealsBetween(addDays(date, -30), date);

  const ideas = useMemo(
    () =>
      proteinIdeas({
        proteinLeft,
        kcalLeft,
        foods: foods.data,
        savedMeals: saved.data,
        recent: recent.data,
        label: (f) => foodLabel(f, i18n.language),
      }),
    [proteinLeft, kcalLeft, foods.data, saved.data, recent.data, i18n.language],
  );
  if (!ideas.length) return null;

  const left = Math.round(proteinLeft);
  return (
    <section className="card mt-3 space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Beef size={18} className="text-protein" />
        {t('protein.title', { grams: left })}
      </h2>
      <ul className="space-y-1.5">
        {ideas.map((idea) => {
          const to =
            idea.kind === 'saved'
              ? `/meal/new?saved=${idea.id}&d=${date}`
              : `/meal/new?food=${encodeURIComponent(idea.id)}&g=${idea.grams}&d=${date}`;
          return (
            <li key={`${idea.kind}-${idea.id}`}>
              <Link to={to} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2 hover:bg-surface-2/70">
                {idea.kind === 'saved' && <Bookmark size={14} className="shrink-0 text-brand" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {idea.grams && (
                      <>
                        <span className="num">{idea.grams} {t('common.g')}</span>{' '}
                      </>
                    )}
                    {idea.name}
                  </span>
                  <span className="block text-xs text-muted">
                    <span className="num font-semibold text-protein">+{idea.protein} {t('common.g')}</span> {t('macros.protein').toLowerCase()} ·{' '}
                    <span className="num">{idea.kcal}</span> {t('common.kcal')}
                    {!idea.fits && <span className="text-carbs"> · {t('protein.overBudget')}</span>}
                  </span>
                </span>
                <ChevronRight size={16} className="flip-rtl shrink-0 text-muted" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const dismissKey = (date: string) => `zid.weighInDismissed.${date}`;
const isDismissed = (date: string) => {
  try {
    return !!localStorage.getItem(dismissKey(date));
  } catch {
    return false;
  }
};

/** One-tap weigh-in when it's been a while (or it's a chosen weigh-in day). */
export function WeighInCard({ today }: { today: string }) {
  const { t } = useTranslation();
  const { uid, profile } = useSession();
  const toast = useToast();
  const logs = useWeightLogs(); // ordered by date
  const latest = logs.data[logs.data.length - 1];
  const status = weighInStatus(latest?.date, today, profile.reminders.weighIn?.days);
  const [kg, setKg] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(() => isDismissed(today));
  const [busy, setBusy] = useState(false);

  if (logs.loading || !status.due || dismissed) return null;
  const value = kg ?? latest?.kg ?? profile.bodyweightKg ?? 0;

  const dismiss = () => {
    try {
      localStorage.setItem(dismissKey(today), '1');
    } catch {
      /* storage blocked: hide for this visit only */
    }
    setDismissed(true);
  };

  const save = async () => {
    if (value <= 0) return;
    setBusy(true);
    try {
      await saveWeightLog(uid, { date: today, kg: value, createdAt: Date.now() }, !latest || today >= latest.date);
      toast(t('progress.weightSaved'), 'success');
    } catch (e) {
      toast(`${t('common.error')} (${(e as { code?: string }).code ?? (e as Error).message})`, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card mt-3 space-y-2">
      <div className="flex items-start gap-2">
        <Scale size={18} className="mt-0.5 shrink-0 text-brand" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">
            {status.daysAgo === null
              ? t('weighIn.first')
              : status.scheduledToday && status.daysAgo < 3
                ? t('weighIn.today')
                : t('weighIn.stale', { count: status.daysAgo })}
          </h2>
          <p className="text-xs text-muted">{t('weighIn.hint')}</p>
        </div>
        <button className="-me-1 -mt-1 rounded-full p-1.5 text-muted hover:bg-surface-2" onClick={dismiss} aria-label={t('weighIn.notToday')} title={t('weighIn.notToday')}>
          <X size={16} />
        </button>
      </div>
      <div className="flex items-end gap-2">
        <NumberField id="wi-kg" className="flex-1" label={t('progress.weight')} suffix={t('common.kg')} value={value} onChange={setKg} step={0.1} />
        <button className="btn-primary" disabled={busy || value <= 0} onClick={() => void save()}>
          {t('common.save')}
        </button>
      </div>
    </section>
  );
}
