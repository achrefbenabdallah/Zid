import { useTranslation } from 'react-i18next';
import type { Macros } from '@/types';

/** "520 kcal · P 32 · C 60 · F 12" with colour-coded macro letters. */
export function MacroLine({ m, big }: { m: Macros; big?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 ${big ? 'text-base' : 'text-xs'} text-muted`}>
      <span className="font-bold text-ink">
        <span className="num">{Math.round(m.kcal)}</span> {t('common.kcal')}
      </span>
      <span>
        <b className="text-protein">{t('macros.p')}</b> <span className="num">{fmt(m.protein)}</span>
      </span>
      <span>
        <b className="text-carbs">{t('macros.c')}</b> <span className="num">{fmt(m.carbs)}</span>
      </span>
      <span>
        <b className="text-fat">{t('macros.f')}</b> <span className="num">{fmt(m.fat)}</span>
      </span>
    </div>
  );
}

const fmt = (n: number) => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10);
