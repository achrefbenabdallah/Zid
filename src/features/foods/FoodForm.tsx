import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, Trash2 } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { NumberField } from '@/components/NumberField';
import { useSession } from '@/features/auth/AuthProvider';
import { deleteFood, saveFood } from '@/services/data';
import type { Food, Macros } from '@/types';

export type FoodDraft = Partial<Omit<Food, 'per100g'>> & { per100g?: Macros };

/** Create or edit a My Foods entry (values per 100 g). */
export function FoodForm({ initial, onClose, onSaved }: {
  initial: FoodDraft | null;
  onClose: () => void;
  onSaved?: (food: Food) => void;
}) {
  const { t } = useTranslation();
  const { uid } = useSession();
  const [f, setF] = useState<FoodDraft>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initial) setF({ per100g: { kcal: 0, protein: 0, carbs: 0, fat: 0 }, favorite: false, ...initial });
  }, [initial]);

  if (!initial) return null;
  const m = f.per100g ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const setM = (k: keyof Macros, v: number) => setF({ ...f, per100g: { ...m, [k]: v } });
  const valid = !!f.name?.trim();

  const save = async () => {
    setBusy(true);
    try {
      const food: Omit<Food, 'id'> & { id?: string } = {
        id: f.id,
        name: f.name!.trim(),
        nameAr: f.nameAr?.trim() || undefined,
        per100g: m,
        barcode: f.barcode || undefined,
        favorite: !!f.favorite,
        source: f.source ?? 'user',
        createdAt: f.createdAt ?? Date.now(),
      };
      const id = await saveFood(uid, food);
      onSaved?.({ ...food, id });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!f.id || !confirm(t('common.confirmDelete'))) return;
    await deleteFood(uid, f.id);
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={f.id ? t('foods.editFood') : t('foods.add')}
      footer={
        <div className="flex gap-2">
          {f.id && (
            <button className="btn-danger" onClick={remove} aria-label={t('common.delete')}>
              <Trash2 size={18} />
            </button>
          )}
          <button
            className={`btn-ghost ${f.favorite ? 'text-carbs' : ''}`}
            onClick={() => setF({ ...f, favorite: !f.favorite })}
            aria-pressed={!!f.favorite}
            aria-label={t('foods.favorites')}
          >
            <Star size={18} fill={f.favorite ? 'currentColor' : 'none'} />
          </button>
          <button className="btn-primary flex-1" disabled={!valid || busy} onClick={save}>
            {t('common.save')}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="label" htmlFor="food-name">{t('foods.name')}</label>
          <input id="food-name" className="input" value={f.name ?? ''} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={120} />
        </div>
        <div>
          <label className="label" htmlFor="food-name-ar">
            {t('foods.nameAr')} <span className="opacity-60">({t('common.optional')})</span>
          </label>
          <input id="food-name-ar" dir="rtl" lang="ar" className="input" value={f.nameAr ?? ''} onChange={(e) => setF({ ...f, nameAr: e.target.value })} maxLength={120} />
        </div>
        <p className="pt-1 text-sm font-semibold">{t('foods.per100g')}</p>
        <div className="grid grid-cols-2 gap-3">
          <NumberField id="f-kcal" label={t('macros.kcal')} suffix={t('common.kcal')} value={m.kcal} onChange={(v) => setM('kcal', v)} />
          <NumberField id="f-p" label={t('macros.protein')} suffix={t('common.g')} value={m.protein} onChange={(v) => setM('protein', v)} />
          <NumberField id="f-c" label={t('macros.carbs')} suffix={t('common.g')} value={m.carbs} onChange={(v) => setM('carbs', v)} />
          <NumberField id="f-f" label={t('macros.fat')} suffix={t('common.g')} value={m.fat} onChange={(v) => setM('fat', v)} />
        </div>
        <div>
          <label className="label" htmlFor="food-barcode">
            {t('foods.barcode')} <span className="opacity-60">({t('common.optional')})</span>
          </label>
          <input id="food-barcode" dir="ltr" inputMode="numeric" className="input num" value={f.barcode ?? ''} onChange={(e) => setF({ ...f, barcode: e.target.value.replace(/\D/g, '') })} />
        </div>
      </div>
    </Sheet>
  );
}
