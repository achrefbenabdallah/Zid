import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { NumberField } from '@/components/NumberField';
import { Empty } from '@/components/Screen';
import { useToast } from '@/components/Toast';
import { useSession } from '@/features/auth/AuthProvider';
import { deleteWeightLog, saveWeightLog, updateProfile, useWeightLogs } from '@/services/data';
import { formatDay, toDateKey } from '@/lib/dates';
import { intlLocale } from '@/i18n';
import type { Measurements, WeightLog } from '@/types';
import { ChartCard, Stat, WeightLine } from '@/features/progress/charts';

const MEASURES: (keyof Measurements)[] = ['arm', 'chest', 'thigh', 'waist', 'bodyFat'];
const fmtDelta = (d: number) => `${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d).toFixed(1)}`;

/** Bodyweight + measurements: log form, trend chart, and history with change vs previous. */
export function BodyPanel({ rangeStart }: { rangeStart: string }) {
  const { t } = useTranslation();
  const { uid } = useSession();
  const toast = useToast();
  const logs = useWeightLogs(); // sorted by date asc
  const [date, setDate] = useState(toDateKey());
  const [kg, setKg] = useState(0);
  const [m, setM] = useState<Measurements>({});
  const [showMeasures, setShowMeasures] = useState(false);
  const [busy, setBusy] = useState(false);
  const locale = intlLocale();

  const sorted = logs.data; // already ordered by date
  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];
  const first = sorted[0];

  const chartData = useMemo(
    () =>
      sorted
        .filter((l) => l.date >= rangeStart)
        .map((l) => ({ date: l.date, label: formatDay(l.date, locale, { day: 'numeric', month: 'short' }), kg: l.kg })),
    [sorted, rangeStart, locale],
  );

  const save = async () => {
    if (kg <= 0) return;
    setBusy(true);
    try {
      const measurements = Object.fromEntries(Object.entries(m).filter(([, v]) => v && v > 0)) as Measurements;
      const log: Omit<WeightLog, 'id'> = { date, kg, ...measurements, createdAt: Date.now() };
      const isLatest = !latest || date >= latest.date;
      await saveWeightLog(uid, log, isLatest);
      toast(t('progress.weightSaved'), 'success');
      setKg(0);
      setM({});
    } catch {
      toast(t('common.error'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (log: WeightLog) => {
    if (!confirm(t('common.confirmDelete'))) return;
    await deleteWeightLog(uid, log.id);
    // Keep the cached bodyweight (used for calorie estimates) pointing at the newest remaining entry.
    if (log.id === latest?.id) await updateProfile(uid, { bodyweightKg: previous?.kg ?? null });
  };

  return (
    <div className="space-y-3">
      {latest && (
        <div className="grid grid-cols-2 gap-3">
          <Stat
            label={t('progress.latest')}
            value={
              <>
                <span>{latest.kg.toFixed(1)}</span> <span className="text-sm font-medium text-muted">{t('common.kg')}</span>
              </>
            }
            sub={formatDay(latest.date, locale)}
          />
          <Stat
            label={t('progress.change')}
            value={
              previous ? (
                <span className="inline-flex items-center gap-1">
                  {latest.kg - previous.kg < 0 ? <TrendingDown size={20} className="text-muted" /> : <TrendingUp size={20} className="text-muted" />}
                  <span dir="ltr">{fmtDelta(latest.kg - previous.kg)}</span>
                </span>
              ) : (
                '—'
              )
            }
            sub={
              previous ? (
                <>
                  {t('progress.vsPrevious')}
                  {first && first.id !== previous.id && (
                    <span className="block">
                      <span dir="ltr">{fmtDelta(latest.kg - first.kg)}</span> {t('progress.total')}
                    </span>
                  )}
                </>
              ) : undefined
            }
          />
        </div>
      )}

      {/* Log form */}
      <section className="card space-y-3">
        <h3 className="font-semibold">{t('progress.logWeight')}</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="w-date">{t('meals.date')}</label>
            <input id="w-date" type="date" className="input num" value={date} max={toDateKey()} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </div>
          <NumberField id="w-kg" label={t('progress.weight')} suffix={t('common.kg')} value={kg} onChange={setKg} />
        </div>
        <button className="inline-flex items-center gap-1 text-xs font-medium text-muted" onClick={() => setShowMeasures(!showMeasures)} aria-expanded={showMeasures}>
          <ChevronDown size={14} className={`transition ${showMeasures ? 'rotate-180' : ''}`} /> {t('progress.measurements')} ({t('common.optional')})
        </button>
        {showMeasures && (
          <div className="grid grid-cols-2 gap-3">
            {MEASURES.map((k) => (
              <NumberField
                key={k}
                label={t(`progress.${k}`)}
                suffix={k === 'bodyFat' ? '%' : t('common.cm')}
                value={m[k] ?? 0}
                onChange={(v) => setM({ ...m, [k]: v })}
              />
            ))}
          </div>
        )}
        <button className="btn-primary w-full" disabled={busy || kg <= 0} onClick={() => void save()}>
          {t('common.save')}
        </button>
      </section>

      {sorted.length === 0 ? (
        <Empty>{t('progress.noWeights')}</Empty>
      ) : (
        <>
          <ChartCard
            title={t('progress.weightTrend')}
            table={{
              head: [t('progress.day'), `${t('progress.weight')} (${t('common.kg')})`],
              rows: chartData.map((d) => [d.label, d.kg.toFixed(1)]),
            }}
          >
            {chartData.length ? (
              <WeightLine data={chartData} color="var(--chart-weight)" unit={t('common.kg')} valueLabel={t('progress.weight')} />
            ) : (
              <p className="py-8 text-center text-sm text-muted">{t('progress.noData')}</p>
            )}
          </ChartCard>

          <section className="card p-0">
            <h3 className="px-4 pt-3 pb-2 font-semibold">{t('progress.history')}</h3>
            <ul className="divide-y divide-line">
              {[...sorted].reverse().map((l, i, arr) => {
                const prev = arr[i + 1];
                const extras = MEASURES.filter((k) => l[k]);
                return (
                  <li key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{formatDay(l.date, locale)}</div>
                      {extras.length > 0 && (
                        <div className="truncate text-xs text-muted">
                          {extras.map((k) => `${t(`progress.${k}`)} ${l[k]}${k === 'bodyFat' ? '%' : ''}`).join(' · ')}
                        </div>
                      )}
                    </div>
                    <div className="text-end">
                      <div className="text-sm font-semibold">
                        <span className="num">{l.kg.toFixed(1)}</span> {t('common.kg')}
                      </div>
                      {prev && (
                        <div className="text-xs text-muted">
                          <span className="num">{fmtDelta(l.kg - prev.kg)}</span>
                        </div>
                      )}
                    </div>
                    <button className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger" onClick={() => void remove(l)} aria-label={t('common.delete')}>
                      <Trash2 size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
