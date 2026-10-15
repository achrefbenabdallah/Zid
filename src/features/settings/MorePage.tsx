import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Download, FileUp, Flame, Info, LogOut, Plus, Scale, Smartphone, Target, User, X } from 'lucide-react';
import { Screen } from '@/components/Screen';
import { LangSwitch } from '@/components/LangSwitch';
import { NumberField } from '@/components/NumberField';
import { useToast } from '@/components/Toast';
import { useAuth, useSession } from '@/features/auth/AuthProvider';
import { updateProfile } from '@/services/data';
import { exportData, type ExportKind } from '@/services/export';
import { notificationState, notify, requestNotifications, type NotifyState } from '@/services/reminders';
import { DEFAULT_GOALS, DEFAULT_MET, DEFAULT_REMINDERS } from '@/lib/defaults';
import { intlLocale } from '@/i18n';
import { isIos, isStandalone, useInstallPrompt } from '@/lib/useInstallPrompt';
import type { Goals, MetSettings, ReminderSettings } from '@/types';
import { ImportSheet } from './ImportSheet';

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="card space-y-3">
      <h2 className="flex items-center gap-2 font-semibold">
        <span className="text-brand">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Weekdays in the user's week order (Monday first), 0 = Sunday like Date.getDay(). */
const WEEK = [1, 2, 3, 4, 5, 6, 0];

function WeighInReminder({ value, onChange }: { value: ReminderSettings['weighIn']; onChange: (v: ReminderSettings['weighIn']) => void }) {
  const { t } = useTranslation();
  const on = !!value;
  // 2026-10-04 was a Sunday: offset by weekday to get a localized short name.
  const dayName = (d: number) => new Date(2026, 9, 4 + d).toLocaleDateString(intlLocale(), { weekday: 'short' });
  return (
    <div className="space-y-2 border-t border-line pt-3">
      <label className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Scale size={16} className="text-muted" /> {t('settings.weighInTime')}
        </span>
        <button
          role="switch"
          aria-checked={on}
          onClick={() => onChange(on ? null : DEFAULT_REMINDERS.weighIn!)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-brand' : 'bg-surface-2'}`}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'start-6' : 'start-1'}`} />
        </button>
      </label>
      {value && (
        <>
          <input
            type="time"
            className="input num"
            aria-label={t('settings.weighInTime')}
            value={value.time}
            onChange={(e) => e.target.value && onChange({ ...value, time: e.target.value })}
          />
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('settings.weighInDays')}>
            {WEEK.map((d) => {
              const active = value.days.includes(d);
              return (
                <button
                  key={d}
                  aria-pressed={active}
                  className={active ? 'chip-active px-2.5' : 'chip px-2.5'}
                  onClick={() => {
                    const days = active ? value.days.filter((x) => x !== d) : [...value.days, d].sort();
                    if (days.length) onChange({ ...value, days });
                  }}
                >
                  {dayName(d)}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted">{t('settings.weighInHint')}</p>
        </>
      )}
    </div>
  );
}

export default function MorePage() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const { uid, profile, user } = useSession();
  const toast = useToast();

  // ── Profile ──
  const [name, setName] = useState(profile.displayName);

  // ── Goals & MET: edited locally, saved explicitly ──
  const [goals, setGoals] = useState<Goals>(profile.goals);
  const [met, setMet] = useState<MetSettings>(profile.met);
  useEffect(() => setGoals(profile.goals), [profile.goals]);
  useEffect(() => setMet(profile.met), [profile.met]);
  const goalsDirty = JSON.stringify(goals) !== JSON.stringify(profile.goals);
  const metDirty = JSON.stringify(met) !== JSON.stringify(profile.met);
  const macroKcal = Math.round(goals.protein * 4 + goals.carbs * 4 + goals.fat * 9);
  const diff = macroKcal - goals.kcal;

  const save = async (patch: Parameters<typeof updateProfile>[1]) => {
    await updateProfile(uid, patch);
    toast(t('settings.saved'), 'success');
  };

  // ── Reminders: saved immediately ──
  const reminders = profile.reminders;
  const [perm, setPerm] = useState<NotifyState>(notificationState());
  const setReminders = (next: ReminderSettings) => void updateProfile(uid, { reminders: next });
  const toggleReminders = async () => {
    if (!reminders.enabled) {
      const p = perm === 'granted' ? perm : await requestNotifications();
      setPerm(p);
      if (p !== 'granted') return;
    }
    setReminders({ ...reminders, enabled: !reminders.enabled });
  };

  // ── Export & install ──
  const [exporting, setExporting] = useState<ExportKind | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const runExport = async (kind: ExportKind) => {
    setExporting(kind);
    try {
      await exportData(uid, kind);
    } catch {
      toast(t('common.error'), 'error');
    } finally {
      setExporting(null);
    }
  };
  const { canInstall, install } = useInstallPrompt();
  const showInstall = !isStandalone() && (canInstall || isIos());

  const setGoal = (k: keyof Goals) => (v: number) => setGoals({ ...goals, [k]: Math.round(v) });
  const setMetField = (k: keyof MetSettings) => (v: number) => setMet({ ...met, [k]: v });

  return (
    <Screen title={t('settings.title')} back menu={false}>
      <div className="space-y-3">
        {/* Profile */}
        <Section icon={<User size={18} />} title={t('settings.profile')}>
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-sm text-muted" dir="ltr">{user.email}</span>
            <LangSwitch />
          </div>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              aria-label={t('settings.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
            />
            <button className="btn-ghost" disabled={!name.trim() || name.trim() === profile.displayName} onClick={() => void save({ displayName: name.trim() })}>
              {t('common.save')}
            </button>
          </div>
        </Section>

        {/* Goals */}
        <Section icon={<Target size={18} />} title={t('settings.goals')}>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label={t('settings.kcalRest')} suffix={t('common.kcal')} value={goals.kcal} onChange={setGoal('kcal')} />
            <NumberField label={t('settings.kcalTraining')} suffix={t('common.kcal')} value={goals.kcalTraining} onChange={setGoal('kcalTraining')} />
            <NumberField label={t('macros.protein')} suffix={t('common.g')} value={goals.protein} onChange={setGoal('protein')} />
            <NumberField label={t('macros.carbs')} suffix={t('common.g')} value={goals.carbs} onChange={setGoal('carbs')} />
            <NumberField label={t('macros.fat')} suffix={t('common.g')} value={goals.fat} onChange={setGoal('fat')} />
            <NumberField label={t('settings.water')} suffix={t('common.ml')} value={goals.waterMl} onChange={setGoal('waterMl')} />
          </div>
          <p className="text-xs text-muted">
            {t('settings.macroCheck', { kcal: macroKcal.toLocaleString('en-US') })}{' '}
            {Math.abs(diff) > 100 && <span className="text-carbs">{t('settings.macroMismatch', { diff: (diff > 0 ? '+' : '−') + Math.abs(diff) })}</span>}
          </p>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setGoals(DEFAULT_GOALS)}>{t('settings.resetDefaults')}</button>
            <button className="btn-primary flex-1" disabled={!goalsDirty || goals.kcal <= 0} onClick={() => void save({ goals })}>
              {t('common.save')}
            </button>
          </div>
        </Section>

        {/* Calories burned */}
        <Section icon={<Flame size={18} />} title={t('settings.met')}>
          <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted" dir="auto">{t('settings.metFormula')}</p>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label={t('settings.minutesPerSet')} value={met.minutesPerSet} onChange={setMetField('minutesPerSet')} />
            <NumberField label={t('settings.metLight')} value={met.light} onChange={setMetField('light')} />
            <NumberField label={t('settings.metModerate')} value={met.moderate} onChange={setMetField('moderate')} />
            <NumberField label={t('settings.metHard')} value={met.hard} onChange={setMetField('hard')} />
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setMet(DEFAULT_MET)}>{t('settings.resetDefaults')}</button>
            <button className="btn-primary flex-1" disabled={!metDirty || met.minutesPerSet <= 0} onClick={() => void save({ met })}>
              {t('common.save')}
            </button>
          </div>
        </Section>

        {/* Reminders */}
        <Section icon={<Bell size={18} />} title={t('settings.reminders')}>
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">{t('settings.remindersOn')}</span>
            <button
              role="switch"
              aria-checked={reminders.enabled}
              onClick={() => void toggleReminders()}
              disabled={perm === 'unsupported'}
              className={`relative h-7 w-12 shrink-0 rounded-full transition ${reminders.enabled ? 'bg-brand' : 'bg-surface-2'}`}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${reminders.enabled ? 'start-6' : 'start-1'}`} />
            </button>
          </label>
          <p className="text-xs text-muted">{t('settings.remindersHint')}</p>
          {perm === 'denied' && <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{t('settings.remindersBlocked')}</p>}
          {perm === 'unsupported' && <p className="rounded-lg bg-carbs/15 px-3 py-2 text-xs">{t('settings.remindersUnsupported')}</p>}

          {reminders.enabled && (
            <>
              <div>
                <span className="label">{t('settings.mealTimes')}</span>
                <div className="flex flex-wrap gap-2">
                  {reminders.meals.map((time, i) => (
                    <span key={i} className="chip gap-2 py-1 ps-1">
                      <input
                        type="time"
                        className="num rounded-full bg-transparent px-2 py-0.5"
                        value={time}
                        onChange={(e) => e.target.value && setReminders({ ...reminders, meals: reminders.meals.map((x, j) => (j === i ? e.target.value : x)).sort() })}
                      />
                      <button aria-label={t('common.delete')} onClick={() => setReminders({ ...reminders, meals: reminders.meals.filter((_, j) => j !== i) })}>
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                  {reminders.meals.length < 6 && (
                    <button className="chip text-muted" onClick={() => setReminders({ ...reminders, meals: [...reminders.meals, '16:00'].sort() })}>
                      <Plus size={14} /> {t('settings.addTime')}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="label" htmlFor="wk-time">{t('settings.workoutTime')}</label>
                  <input
                    id="wk-time"
                    type="time"
                    className="input num"
                    value={reminders.workout ?? ''}
                    onChange={(e) => setReminders({ ...reminders, workout: e.target.value || null })}
                  />
                </div>
                <button className="btn-ghost" onClick={() => void notify(t('settings.mealReminder'), t('settings.mealReminderBody'), '/meal/new')}>
                  {t('settings.test')}
                </button>
              </div>
              <WeighInReminder value={reminders.weighIn ?? null} onChange={(weighIn) => setReminders({ ...reminders, weighIn })} />
            </>
          )}
        </Section>

        {/* Install */}
        {showInstall && (
          <Section icon={<Smartphone size={18} />} title={t('settings.install')}>
            <p className="text-sm text-muted">{t('settings.installHint')}</p>
            {canInstall ? (
              <button className="btn-accent w-full" onClick={() => void install()}>
                <Download size={16} /> {t('settings.install')}
              </button>
            ) : (
              <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm">{t('settings.installIos')}</p>
            )}
          </Section>
        )}

        {/* Data export */}
        <Section icon={<Download size={18} />} title={t('settings.data')}>
          <button className="btn-ghost w-full justify-start" onClick={() => setImportOpen(true)}>
            <FileUp size={16} /> {t('import.button')}
          </button>
          <button className="btn-ghost w-full justify-start" disabled={!!exporting} onClick={() => void runExport('json')}>
            <Download size={16} /> {exporting === 'json' ? t('settings.exporting') : t('settings.exportJson')}
          </button>
          <div className="grid grid-cols-3 gap-2">
            {(['meals', 'workouts', 'weights'] as const).map((k) => (
              <button key={k} className="btn-ghost px-2 text-xs" disabled={!!exporting} onClick={() => void runExport(k)}>
                {exporting === k ? '…' : t(`settings.export${k[0].toUpperCase()}${k.slice(1)}`)}
              </button>
            ))}
          </div>
        </Section>

        {/* About */}
        <Section icon={<Info size={18} />} title={t('settings.about')}>
          <p className="text-sm">{t('settings.aiDisclaimer')}</p>
          <p className="text-xs text-muted">{t('settings.credits')}</p>
          <p className="text-xs text-muted">
            {t('app.name')} — <span lang="ar">كول بالعقل، كبّر بالجد</span> · {t('settings.version', { v: __APP_VERSION__ })}
          </p>
        </Section>

        <ImportSheet open={importOpen} onClose={() => setImportOpen(false)} />

        <button className="btn-danger w-full py-3" onClick={() => void signOut()}>
          <LogOut size={16} className="flip-rtl" /> {t('auth.signOut')}
        </button>
      </div>
    </Screen>
  );
}
