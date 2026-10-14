import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, X } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { useSession } from '@/features/auth/AuthProvider';
import { deleteSavedMeal, saveSavedMeal } from '@/services/data';
import { sumMacros, uid as newId } from '@/lib/macros';
import { MEAL_TYPES, type MealType, type SavedMeal } from '@/types';
import { MacroLine } from './MacroLine';

export type SavedMealDraft = Omit<SavedMeal, 'id' | 'createdAt'> & { id?: string; createdAt?: number };

/** Create (no id) or edit a saved meal: name, default meal type, items (remove only). */
export function SavedMealSheet({ initial, onClose, onSaved }: { initial: SavedMealDraft | null; onClose: () => void; onSaved?: (m: SavedMeal) => void }) {
  const { t } = useTranslation();
  const { uid } = useSession();
  const toast = useToast();
  const [m, setM] = useState<SavedMealDraft | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setM(initial ? structuredClone(initial) : null), [initial]);
  if (!m) return null;
  const editing = !!m.id;
  const total = sumMacros(m.items);

  const save = async () => {
    setBusy(true);
    try {
      const meal: SavedMeal = {
        ...m,
        id: m.id ?? newId(),
        name: m.name.trim(),
        createdAt: m.createdAt ?? Date.now(),
        items: m.items.map(({ foodName, foodId, grams, kcal, protein, carbs, fat }) => ({ foodName, ...(foodId ? { foodId } : {}), grams, kcal, protein, carbs, fat })),
      };
      await saveSavedMeal(uid, meal);
      toast(t('savedMeals.saved'), 'success');
      onSaved?.(meal);
      onClose();
    } catch (e) {
      toast(`${t('common.error')} (${(e as { code?: string }).code ?? (e as Error).message})`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!m.id || !confirm(t('savedMeals.deleteConfirm'))) return;
    await deleteSavedMeal(uid, m.id);
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={editing ? t('savedMeals.edit') : t('savedMeals.saveAs')}
      footer={
        <div className="flex gap-2">
          {editing && (
            <button className="btn-danger" onClick={() => void remove()} aria-label={t('common.delete')}>
              <Trash2 size={18} />
            </button>
          )}
          <button className="btn-primary flex-1" disabled={busy || !m.name.trim() || !m.items.length} onClick={() => void save()}>
            {t('common.save')}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="sm-name">{t('savedMeals.name')}</label>
          <input
            id="sm-name"
            className="input"
            maxLength={60}
            value={m.name}
            placeholder={t('savedMeals.namePlaceholder')}
            onChange={(e) => setM({ ...m, name: e.target.value })}
            autoFocus={!editing}
          />
        </div>
        <div>
          <label className="label" htmlFor="sm-type">{t('meals.mealType')}</label>
          <select
            id="sm-type"
            className="input"
            value={m.mealType ?? ''}
            onChange={(e) => setM({ ...m, mealType: (e.target.value || undefined) as MealType | undefined })}
          >
            <option value="">{t('savedMeals.anyMeal')}</option>
            {MEAL_TYPES.map((mt) => (
              <option key={mt} value={mt}>
                {t(`mealTypes.${mt}`)}
              </option>
            ))}
          </select>
        </div>
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {m.items.map((it, i) => (
            <li key={i} className="flex items-center gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{it.foodName}</div>
                <MacroLine m={it} />
              </div>
              <span className="num shrink-0 text-xs text-muted">
                {it.grams} {t('common.g')}
              </span>
              <button
                className="rounded-lg p-1.5 text-muted hover:text-danger"
                onClick={() => setM({ ...m, items: m.items.filter((_, j) => j !== i) })}
                aria-label={t('meals.deleteItem')}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2 text-sm">
          <span className="font-semibold">{t('common.total')}</span>
          <MacroLine m={total} />
        </div>
      </div>
    </Sheet>
  );
}
