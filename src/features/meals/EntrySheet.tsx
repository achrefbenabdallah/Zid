import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Trash2 } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { useSession } from '@/features/auth/AuthProvider';
import { copyMealEntries, deleteMealEntry, getMealPhoto, updateMealEntry } from '@/services/data';
import { scaleMacros, toPer100g } from '@/lib/macros';
import { toDateKey } from '@/lib/dates';
import { MEAL_TYPES, type MealEntry, type MealType } from '@/types';
import { MacroLine } from './MacroLine';

/** Edit grams / meal type of a logged entry, delete it, or log it again today. */
export function EntrySheet({ entry, onClose }: { entry: MealEntry | null; onClose: () => void }) {
  const { t } = useTranslation();
  const { uid } = useSession();
  const toast = useToast();
  const [grams, setGrams] = useState('');
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!entry) return;
    setGrams(String(entry.grams));
    setMealType(entry.mealType);
    setPhoto(null);
    if (entry.photoId) void getMealPhoto(uid, entry.photoId).then(setPhoto);
  }, [entry, uid]);

  if (!entry) return null;
  const g = Number(grams) || 0;
  // Keep the entry's original macro density when grams change.
  const per100 = toPer100g(entry, entry.grams);
  const scaled = scaleMacros(per100, g);

  const save = async () => {
    await updateMealEntry(uid, entry.id, { grams: g, mealType, ...scaled });
    onClose();
  };
  const remove = async () => {
    await deleteMealEntry(uid, entry);
    onClose();
  };
  const again = async () => {
    await copyMealEntries(uid, [{ ...entry, grams: g, mealType, ...scaled }], toDateKey());
    toast(t('meals.duplicated'), 'success');
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={entry.foodName}
      footer={
        <div className="flex gap-2">
          <button className="btn-danger" onClick={remove} aria-label={t('common.delete')}>
            <Trash2 size={18} />
          </button>
          <button className="btn-ghost" onClick={again}>
            <Copy size={16} /> {t('meals.duplicate')}
          </button>
          <button className="btn-primary flex-1" onClick={save} disabled={g <= 0}>
            {t('common.save')}
          </button>
        </div>
      }
    >
      {photo && <img src={photo} alt="" className="mb-3 aspect-[4/3] w-full rounded-2xl object-cover" />}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">{t('meals.grams')}</label>
          <input className="input num w-full" inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value.replace(',', '.'))} />
        </div>
        <div>
          <label className="label">{t('meals.mealType')}</label>
          <select className="input" value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>
            {MEAL_TYPES.map((m) => (
              <option key={m} value={m}>
                {t(`mealTypes.${m}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-4 rounded-xl bg-surface-2 p-3">
        <MacroLine m={scaled} big />
      </div>
    </Sheet>
  );
}
