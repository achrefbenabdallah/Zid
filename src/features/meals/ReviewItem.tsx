import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookmarkCheck, BookmarkPlus, ChevronDown, Minus, Plus, Sparkles, Trash2 } from 'lucide-react';
import { NumberField } from '@/components/NumberField';
import type { Macros } from '@/types';
import { itemMacros, type DraftItem } from './draft';
import { MacroLine } from './MacroLine';

export function ReviewItem({ item, onChange, onRemove, onSaveToFoods }: {
  item: DraftItem;
  onChange: (next: DraftItem) => void;
  onRemove: () => void;
  onSaveToFoods?: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const m = itemMacros(item);
  const setPer = (k: keyof Macros, v: number) => onChange({ ...item, per100g: { ...item.per100g, [k]: v } });
  const step = (d: number) => onChange({ ...item, grams: Math.max(0, Math.round(item.grams + d)) });
  const lowConfidence = item.origin === 'ai' && item.confidence !== undefined && item.confidence < 0.6;

  return (
    <div className="card space-y-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <input
            className="input py-2 font-semibold"
            value={item.name}
            aria-label={t('meals.itemName')}
            onChange={(e) => onChange({ ...item, name: e.target.value })}
            maxLength={120}
          />
          {item.origin === 'ai' && (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
              <span className="inline-flex items-center gap-1">
                <Sparkles size={12} /> {t('meals.ai')}
              </span>
              {item.confidence !== undefined && (
                <span className={lowConfidence ? 'font-semibold text-carbs' : ''}>
                  <span className="num">{Math.round(item.confidence * 100)}%</span> {t('meals.confidence')}
                </span>
              )}
              {item.nameAr && <span dir="rtl" lang="ar">{item.nameAr}</span>}
            </div>
          )}
        </div>
        <button className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger" onClick={onRemove} aria-label={t('meals.deleteItem')}>
          <Trash2 size={18} />
        </button>
      </div>

      <div className="flex items-end gap-2">
        <button className="btn-ghost h-11 w-11 p-0" onClick={() => step(-10)} aria-label={'-10 ' + t('common.g')}>
          <Minus size={16} />
        </button>
        <NumberField className="flex-1" label={t('meals.grams')} suffix={t('common.g')} value={item.grams} onChange={(g) => onChange({ ...item, grams: g })} />
        <button className="btn-ghost h-11 w-11 p-0" onClick={() => step(10)} aria-label={'+10 ' + t('common.g')}>
          <Plus size={16} />
        </button>
      </div>

      <MacroLine m={m} big />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button className="inline-flex items-center gap-1 text-xs font-medium text-muted" onClick={() => setOpen(!open)} aria-expanded={open}>
          <ChevronDown size={14} className={`transition ${open ? 'rotate-180' : ''}`} /> {t('meals.per100')}
        </button>
        {onSaveToFoods &&
          (item.foodId ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-brand">
              <BookmarkCheck size={14} /> {t('meals.savedToMyFoods')}
            </span>
          ) : (
            <button className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand" onClick={onSaveToFoods}>
              <BookmarkPlus size={14} /> {t('meals.saveToMyFoods')}
            </button>
          ))}
      </div>

      {open && (
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-2 p-3">
          <NumberField label={t('macros.kcal')} value={item.per100g.kcal} onChange={(v) => setPer('kcal', v)} />
          <NumberField label={t('macros.protein')} value={item.per100g.protein} onChange={(v) => setPer('protein', v)} />
          <NumberField label={t('macros.carbs')} value={item.per100g.carbs} onChange={(v) => setPer('carbs', v)} />
          <NumberField label={t('macros.fat')} value={item.per100g.fat} onChange={(v) => setPer('fat', v)} />
        </div>
      )}
    </div>
  );
}
