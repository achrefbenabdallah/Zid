import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, FileUp } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { Spinner } from '@/components/Screen';
import { useSession } from '@/features/auth/AuthProvider';
import { parseZidExport, type ZidData, type ZidError, type ZidProfile } from '@/lib/zidFormat';
import { planImport, runImport, type ImportPlan } from '@/services/dataImport';
import type { Goals } from '@/types';

type State =
  | { step: 'pick' }
  | { step: 'reading' }
  | { step: 'invalid'; errors: ZidError[] }
  | { step: 'preview'; data: ZidData; plan: ImportPlan }
  | { step: 'importing'; done: number; total: number }
  | { step: 'done'; count: number }
  | { step: 'failed'; message: string };

/** Settings → Import: validate → preview → confirm → batched write with progress. */
export function ImportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { uid, profile } = useSession();
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ step: 'pick' });
  const [applyGoals, setApplyGoals] = useState(false);
  const [applyProfile, setApplyProfile] = useState(false);

  const close = () => {
    if (state.step === 'importing') return; // don't interrupt a running import
    setState({ step: 'pick' });
    onClose();
  };

  const onFile = async (file: File | undefined) => {
    if (input.current) input.current.value = ''; // allow picking the same file again
    if (!file) return;
    if (!navigator.onLine) return setState({ step: 'failed', message: t('import.needOnline') });
    setState({ step: 'reading' });
    try {
      const parsed = parseZidExport(await file.text());
      if (!parsed.ok) return setState({ step: 'invalid', errors: parsed.errors });
      const plan = await planImport(uid, parsed.data, profile);
      setApplyGoals(!!plan.summary.goals?.suggested);
      setApplyProfile(!!plan.summary.profile?.suggested);
      setState({ step: 'preview', data: parsed.data, plan });
    } catch (e) {
      setState({ step: 'failed', message: (e as Error).message });
    }
  };

  const confirm = async () => {
    if (state.step !== 'preview') return;
    const { plan } = state;
    try {
      const count = await runImport(plan, { applyGoals, applyProfile }, (done, total) => setState({ step: 'importing', done, total }));
      setState({ step: 'done', count });
    } catch (e) {
      setState({ step: 'failed', message: (e as Error).message });
    }
  };

  const errorText = (e: ZidError) =>
    e.code === 'invalidJson' || e.code === 'notObject' || e.code === 'schemaVersion'
      ? t(`import.errors.${e.code}`, { got: e.got })
      : `${e.path} ${t(`import.errors.${e.code}`, { got: e.got })}`;

  return (
    <Sheet
      open={open}
      onClose={close}
      title={t('import.title')}
      footer={
        state.step === 'preview' ? (
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setState({ step: 'pick' })}>{t('common.cancel')}</button>
            <button className="btn-primary flex-1" onClick={() => void confirm()}>{t('import.confirm')}</button>
          </div>
        ) : state.step === 'done' ? (
          <button className="btn-primary w-full" onClick={close}>{t('common.done')}</button>
        ) : undefined
      }
    >
      <input ref={input} type="file" accept=".json,application/json" hidden onChange={(e) => void onFile(e.target.files?.[0])} />

      {(state.step === 'pick' || state.step === 'invalid' || state.step === 'failed') && (
        <div className="space-y-3">
          <p className="text-sm text-muted">{t('import.hint')}</p>
          {state.step === 'invalid' && (
            <div className="rounded-xl bg-danger/10 p-3 text-sm text-danger" role="alert">
              <p className="mb-1 font-semibold">{t('import.invalid')}</p>
              <ul className="list-disc space-y-0.5 ps-5" dir="ltr">
                {state.errors.map((e, i) => (
                  <li key={i}>{errorText(e)}</li>
                ))}
              </ul>
              {state.errors.length >= 25 && <p className="mt-1">{t('import.more')}</p>}
            </div>
          )}
          {state.step === 'failed' && (
            <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger" role="alert">
              {state.message === t('import.needOnline') ? state.message : t('import.failed', { error: state.message })}
            </p>
          )}
          <button className="btn-primary w-full py-3" onClick={() => input.current?.click()}>
            <FileUp size={18} /> {t('import.choose')}
          </button>
        </div>
      )}

      {state.step === 'reading' && <Spinner label={t('import.reading')} />}

      {state.step === 'preview' && (
        <Preview plan={state.plan} applyGoals={applyGoals} setApplyGoals={setApplyGoals} applyProfile={applyProfile} setApplyProfile={setApplyProfile} />
      )}

      {state.step === 'importing' && (
        <div className="py-6">
          <p className="mb-2 text-center text-sm font-semibold">{t('import.importing', { done: state.done, total: state.total })}</p>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${state.total ? (state.done / state.total) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {state.step === 'done' && (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <CheckCircle2 size={40} className="text-brand" />
          <p className="font-semibold">{state.count ? t('import.done', { count: state.count }) : t('import.nothing')}</p>
        </div>
      )}
    </Sheet>
  );
}

function Preview({ plan, applyGoals, setApplyGoals, applyProfile, setApplyProfile }: {
  plan: ImportPlan;
  applyGoals: boolean;
  setApplyGoals: (v: boolean) => void;
  applyProfile: boolean;
  setApplyProfile: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const s = plan.summary;
  const tile = (label: string, value: number, sub?: string) => (
    <div className="rounded-xl bg-surface-2 p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="num text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
  const goalLine = (g: Goals) => `${g.kcal}/${g.kcalTraining} kcal · P${g.protein} C${g.carbs} F${g.fat}`;
  const profileLine = (p: ZidProfile) =>
    [p.sex, p.age && `${p.age}`, p.heightCm && `${p.heightCm} cm`, p.startWeightKg && `${p.startWeightKg} kg`, p.startBodyFatPct && `${p.startBodyFatPct}%`]
      .filter(Boolean)
      .join(' · ') || '—';

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-sm font-semibold">{t('import.fileHas')}</h3>
        <div className="grid grid-cols-2 gap-2">
          {tile(t('import.foods'), s.foods.total)}
          {tile(t('import.meals'), s.meals.total)}
          {tile(t('import.workoutRows'), s.workouts.rows, t('import.overDays', { days: s.workouts.days }))}
          {tile(t('import.weights'), s.weights.total)}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">{t('import.willDo')}</h3>
        <ul className="space-y-1.5 text-sm">
          <li>{t('import.foodsLine', { created: s.foods.created, existing: s.foods.existing })}</li>
          <li>{t('import.mealsLine', { created: s.meals.created, updated: s.meals.updated })}</li>
          <li>{t('import.workoutsLine', { created: s.workouts.created, updated: s.workouts.updated, days: s.workouts.days, present: s.workouts.alreadyPresent })}</li>
          <li>{t('import.weightsLine', { created: s.weights.created, updated: s.weights.updated })}</li>
        </ul>
        <div className="mt-2 space-y-1 text-xs text-muted">
          {s.matchedExercises > 0 && <p>{t('import.matched', { count: s.matchedExercises })}</p>}
          {s.customExercises.length > 0 && <p>{t('import.custom', { names: s.customExercises.join(', ') })}</p>}
        </div>
        {s.unknownMealTypes.length > 0 && (
          <p className="mt-2 flex gap-2 rounded-lg bg-carbs/15 px-3 py-2 text-xs">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-carbs" />
            {t('import.unknownMeals', { labels: s.unknownMealTypes.join(', ') })}
          </p>
        )}
      </div>

      {s.goals?.differs && (
        <label className="flex items-start gap-3 rounded-xl border border-line p-3">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--brand)]" checked={applyGoals} onChange={(e) => setApplyGoals(e.target.checked)} />
          <span className="text-sm">
            <span className="font-medium">{t('import.goalsQ')}</span>
            <span className="mt-0.5 block text-xs text-muted" dir="ltr">
              {t('import.current')}: {goalLine(s.goals.current)}
              <br />
              {t('import.inFile')}: {goalLine(s.goals.file)}
            </span>
          </span>
        </label>
      )}
      {s.profile?.differs && (
        <label className="flex items-start gap-3 rounded-xl border border-line p-3">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--brand)]" checked={applyProfile} onChange={(e) => setApplyProfile(e.target.checked)} />
          <span className="text-sm">
            <span className="font-medium">{t('import.profileQ')}</span>
            <span className="mt-0.5 block text-xs text-muted" dir="ltr">
              {t('import.current')}: {profileLine(s.profile.current)}
              <br />
              {t('import.inFile')}: {profileLine(s.profile.file)}
            </span>
          </span>
        </label>
      )}
    </div>
  );
}
