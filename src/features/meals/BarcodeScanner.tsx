import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { cameraAvailable, startScan, type ScanHandle } from '@/services/barcode';

/** Live camera scanner with a manual-entry fallback. Calls onCode once. */
export function BarcodeScanner({ onCode, busyText }: { onCode: (code: string) => void; busyText?: string | null }) {
  const { t } = useTranslation();
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(cameraAvailable() ? null : t('barcode.unsupported'));
  const [manual, setManual] = useState('');

  useEffect(() => {
    if (!cameraAvailable() || !video.current) return;
    let handle: ScanHandle | null = null;
    let cancelled = false;
    startScan(video.current, (code) => {
      handle?.stop();
      navigator.vibrate?.(60);
      onCode(code);
    })
      .then((h) => {
        if (cancelled) h.stop();
        else handle = h;
      })
      .catch((e: Error) => setError(e.name === 'NotAllowedError' ? t('barcode.cameraDenied') : t('barcode.unsupported')));
    return () => {
      cancelled = true;
      handle?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (manual.trim()) onCode(manual.trim());
  };

  return (
    <div className="space-y-4">
      {!error && (
        <div className="relative overflow-hidden rounded-3xl bg-black">
          <video ref={video} className="aspect-[3/4] w-full object-cover" muted playsInline />
          {/* Aiming frame */}
          <div className="pointer-events-none absolute inset-x-8 top-1/2 h-32 -translate-y-1/2 rounded-2xl border-4 border-accent/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          <p className="absolute inset-x-0 bottom-4 text-center text-sm font-medium text-white">{busyText ?? t('barcode.point')}</p>
        </div>
      )}
      {error && <p className="rounded-xl bg-carbs/15 px-4 py-3 text-sm">{error}</p>}
      {error && busyText && <p className="text-center text-sm text-muted">{busyText}</p>}
      <form onSubmit={submit} className="flex gap-2">
        <input
          className="input num flex-1"
          dir="ltr"
          inputMode="numeric"
          placeholder={t('barcode.typeCode')}
          value={manual}
          onChange={(e) => setManual(e.target.value.replace(/\D/g, ''))}
        />
        <button className="btn-primary" disabled={manual.length < 6}>
          {t('barcode.lookup')}
        </button>
      </form>
      <p className="text-center text-[11px] text-muted">{t('barcode.attribution')}</p>
    </div>
  );
}
