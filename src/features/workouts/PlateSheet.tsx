import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet } from '@/components/Sheet';
import { NumberField } from '@/components/NumberField';
import { ALL_PLATES, BAR_OPTIONS, PLATE_STYLE, loadStep, platesPerSide, warmupSets } from '@/lib/plates';

/** How an exercise is loaded, from its equipment. */
export type LoadKind = 'barbell' | 'ezBar' | 'machine' | 'dumbbell' | 'stack' | 'none';

export function loadKindOf(equipment: string | undefined): LoadKind {
  switch (equipment) {
    case undefined:
    case 'barbell':
      return 'barbell';
    case 'e-z curl bar':
      return 'ezBar';
    case 'machine':
      return 'machine';
    case 'dumbbell':
    case 'kettlebells':
      return 'dumbbell';
    case 'body only':
      return 'none';
    default:
      return 'stack'; // cable and other selectorised kit
  }
}

const DEFAULT_BAR: Record<LoadKind, number> = { barbell: 20, ezBar: 10, machine: 0, dumbbell: 0, stack: 0, none: 0 };
/** Warm-up rounding where plates don't apply. */
const FIXED_STEP: Partial<Record<LoadKind, number>> = { dumbbell: 2, stack: 5 };
const usesPlates = (k: LoadKind) => k === 'barbell' || k === 'ezBar' || k === 'machine';

interface PlatePrefs {
  plates: number[];
  bar: Partial<Record<LoadKind, number>>;
}
const PREFS_KEY = 'zid.plates';
function readPrefs(): PlatePrefs {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '') as PlatePrefs;
    if (Array.isArray(p.plates) && p.plates.length) return p;
  } catch {
    /* no prefs yet */
  }
  return { plates: [...ALL_PLATES], bar: {} };
}
function writePrefs(p: PlatePrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* storage blocked */
  }
}

const kgText = (kg: number) => String(Math.round(kg * 100) / 100);

/** Plates per side + a warm-up ramp for a target weight. */
export function PlateSheet({ open, onClose, initialKg, equipment, title }: {
  open: boolean;
  onClose: () => void;
  initialKg?: number;
  equipment?: string;
  title?: string;
}) {
  const { t } = useTranslation();
  const kind = loadKindOf(equipment);
  const [prefs, setPrefs] = useState<PlatePrefs>(readPrefs);
  const [target, setTarget] = useState(initialKg ?? 60);
  useEffect(() => {
    if (open) setTarget(initialKg && initialKg > 0 ? initialKg : 60);
  }, [open, initialKg]);

  const plated = usesPlates(kind);
  const bar = plated ? (prefs.bar[kind] ?? DEFAULT_BAR[kind]) : 0;
  const step = plated ? loadStep(prefs.plates) : (FIXED_STEP[kind] ?? 2.5);
  const load = platesPerSide(target, bar, prefs.plates);
  const warmups = warmupSets(target, { barKg: bar, step });

  const update = (p: PlatePrefs) => {
    setPrefs(p);
    writePrefs(p);
  };
  const togglePlate = (p: number) => {
    const has = prefs.plates.includes(p);
    if (has && prefs.plates.length === 1) return;
    update({ ...prefs, plates: has ? prefs.plates.filter((x) => x !== p) : [...prefs.plates, p].sort((a, b) => b - a) });
  };
  const perSideText = (perSide: number[]) => (perSide.length ? perSide.map(kgText).join(' + ') : t('plates.emptyBar'));

  return (
    <Sheet open={open} onClose={onClose} title={title ?? t('plates.title')}>
      <div className="space-y-4">
        <NumberField id="plate-target" label={t('plates.target')} suffix={t('common.kg')} value={target} onChange={setTarget} step={step} />

        {plated && (
          <>
            <div>
              <span className="label">{t('plates.bar')}</span>
              <div className="flex flex-wrap gap-1.5">
                {BAR_OPTIONS.map((b) => (
                  <button
                    key={b}
                    aria-pressed={bar === b}
                    className={bar === b ? 'chip-active' : 'chip'}
                    onClick={() => update({ ...prefs, bar: { ...prefs.bar, [kind]: b } })}
                  >
                    {b ? (
                      <>
                        <span className="num">{b}</span> {t('common.kg')}
                      </>
                    ) : (
                      t('plates.noBar')
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Diagram: one sleeve, plates from the collar outwards. */}
            <div className="rounded-2xl bg-surface-2 p-3">
              <div className="flex h-28 items-center" dir="ltr" aria-hidden="true">
                <div className="h-3 w-10 shrink-0 rounded-s bg-muted/50" />
                <div className="h-6 w-2 shrink-0 rounded-sm bg-muted" />
                {load.perSide.map((p, i) => {
                  const s = PLATE_STYLE[p] ?? { bg: '#888', fg: '#fff', h: 60 };
                  return (
                    <div
                      key={i}
                      className="ms-0.5 grid w-6 shrink-0 place-items-center rounded-sm text-[9px] font-bold shadow-sm ring-1 ring-black/10"
                      style={{ height: `${s.h}%`, background: s.bg, color: s.fg }}
                    >
                      <span className="-rotate-90 whitespace-nowrap">{kgText(p)}</span>
                    </div>
                  );
                })}
                <div className="h-3 min-w-4 flex-1 rounded-e bg-muted/50" />
              </div>
              <p className="mt-2 text-sm">
                <span className="text-muted">{t('plates.perSide')}:</span> <span className="num font-semibold">{perSideText(load.perSide)}</span>
              </p>
              {!load.exact && (
                <p className="mt-1 text-xs text-carbs">{t('plates.closest', { kg: kgText(load.loadedKg) })}</p>
              )}
            </div>

            <div>
              <span className="label">{t('plates.available')}</span>
              <div className="flex flex-wrap gap-1.5">
                {ALL_PLATES.map((p) => (
                  <button key={p} aria-pressed={prefs.plates.includes(p)} className={prefs.plates.includes(p) ? 'chip-active' : 'chip'} onClick={() => togglePlate(p)}>
                    <span className="num">{kgText(p)}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div>
          <h3 className="mb-1.5 text-sm font-semibold">{t('plates.warmup')}</h3>
          {warmups.length === 0 ? (
            <p className="text-xs text-muted">{t('plates.noWarmup')}</p>
          ) : (
            <ol className="divide-y divide-line rounded-xl border border-line">
              {warmups.map((w, i) => (
                <li key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="num w-5 text-muted">{i + 1}</span>
                  <span className="num flex-1 font-semibold">
                    {kgText(w.kg)} {t('common.kg')} × {w.reps}
                  </span>
                  {plated && <span className="num text-xs text-muted">{perSideText(platesPerSide(w.kg, bar, prefs.plates).perSide)}</span>}
                </li>
              ))}
              <li className="flex items-center gap-3 bg-brand/10 px-3 py-2 text-sm">
                <span className="w-5" />
                <span className="num flex-1 font-semibold text-brand">
                  {kgText(target)} {t('common.kg')} · {t('plates.workSets')}
                </span>
              </li>
            </ol>
          )}
          <p className="mt-2 text-xs text-muted">{t('plates.warmupHint')}</p>
        </div>
      </div>
    </Sheet>
  );
}
