import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, Plus, Timer, X } from 'lucide-react';

export const REST_PRESETS = [60, 90, 120, 180];

/** Short beep via WebAudio — no audio asset needed, works offline. */
function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    /* audio unavailable */
  }
}

/**
 * Floating countdown shown after a set is ticked. Uses an absolute end time so it
 * stays correct if the phone locks or the tab is throttled.
 */
export function RestTimer({ endAt, onChange }: { endAt: number | null; onChange: (endAt: number | null) => void }) {
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now());
  const fired = useRef<number | null>(null);

  useEffect(() => {
    if (!endAt) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endAt]);

  const left = endAt ? Math.max(0, Math.ceil((endAt - now) / 1000)) : 0;

  useEffect(() => {
    if (endAt && left === 0 && fired.current !== endAt) {
      fired.current = endAt;
      navigator.vibrate?.([200, 100, 200]);
      beep();
      if (document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Zid', { body: t('workouts.restDone'), icon: '/icon.svg' });
      }
      const id = setTimeout(() => onChange(null), 2500);
      return () => clearTimeout(id);
    }
  }, [endAt, left, onChange, t]);

  if (!endAt) return null;
  const done = left === 0;
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');

  return (
    // Pinned under the header so it never covers the set inputs or the Finish button.
    <div className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4.25rem)] z-40 flex justify-center px-4">
      <div className={`flex w-full max-w-md items-center gap-2 rounded-2xl px-3 py-2 shadow-xl ${done ? 'bg-accent text-accent-ink' : 'bg-ink text-bg'}`}>
        <Timer size={20} />
        <div className="flex-1 text-sm font-semibold">
          {done ? t('workouts.restDone') : t('workouts.rest')}
          {!done && (
            <span className="num ms-2 text-xl font-extrabold">
              {mm}:{ss}
            </span>
          )}
        </div>
        {!done && (
          <>
            <button className="rounded-lg p-2 hover:bg-white/10" onClick={() => onChange(endAt - 15_000)} aria-label="-15s">
              <Minus size={16} />
            </button>
            <button className="rounded-lg p-2 hover:bg-white/10" onClick={() => onChange(endAt + 15_000)} aria-label="+15s">
              <Plus size={16} />
            </button>
          </>
        )}
        <button className="rounded-lg p-2 hover:bg-white/10" onClick={() => onChange(null)} aria-label={t('workouts.skip')}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
