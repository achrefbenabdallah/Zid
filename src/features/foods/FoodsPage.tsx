import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Bookmark, Plus } from 'lucide-react';
import { Empty, Screen, Spinner } from '@/components/Screen';
import { useSession } from '@/features/auth/AuthProvider';
import { toggleFavorite, useSavedMeals } from '@/services/data';
import { sumMacros } from '@/lib/macros';
import type { SavedMeal } from '@/types';
import { MacroLine } from '@/features/meals/MacroLine';
import { SavedMealSheet } from '@/features/meals/SavedMealSheet';
import { FoodList } from './FoodList';
import { FoodForm, type FoodDraft } from './FoodForm';

type Tab = 'foods' | 'meals';

export default function FoodsPage() {
  const { t } = useTranslation();
  const { uid } = useSession();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'meals' ? 'meals' : 'foods';
  const [editing, setEditing] = useState<FoodDraft | null>(null);
  const [editingMeal, setEditingMeal] = useState<SavedMeal | null>(null);
  const saved = useSavedMeals();

  return (
    <Screen
      title={t('foods.title')}
      actions={
        tab === 'foods' && (
          <button className="btn-primary py-2" onClick={() => setEditing({})}>
            <Plus size={16} /> {t('foods.add')}
          </button>
        )
      }
    >
      <div className="mb-4 inline-flex rounded-xl bg-surface-2 p-1" role="tablist">
        {(['foods', 'meals'] as Tab[]).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === k ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
            onClick={() => setParams(k === 'foods' ? {} : { tab: k }, { replace: true })}
          >
            {k === 'foods' ? t('foods.all') : t('savedMeals.title')}
          </button>
        ))}
      </div>

      {tab === 'foods' ? (
        <FoodList onSelect={(f) => setEditing(f)} onToggleFavorite={(f) => void toggleFavorite(uid, f.id, !f.favorite)} />
      ) : saved.loading ? (
        <Spinner />
      ) : saved.data.length === 0 ? (
        <Empty>{t('savedMeals.empty')}</Empty>
      ) : (
        <ul className="space-y-2">
          {saved.data.map((sm) => (
            <li key={sm.id}>
              <button className="card flex w-full items-start gap-3 p-3 text-start" onClick={() => setEditingMeal(sm)}>
                <Bookmark size={18} className="mt-0.5 shrink-0 text-brand" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {sm.name}
                    {sm.mealType && <span className="font-normal text-muted"> · {t(`mealTypes.${sm.mealType}`)}</span>}
                  </span>
                  <span className="block truncate text-xs text-muted">{sm.items.map((i) => i.foodName).join(' · ')}</span>
                  <span className="mt-1 block">
                    <MacroLine m={sumMacros(sm.items)} />
                  </span>
                </span>
                {!!sm.useCount && <span className="num shrink-0 text-xs text-muted">×{sm.useCount}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      <FoodForm initial={editing} onClose={() => setEditing(null)} />
      <SavedMealSheet initial={editingMeal} onClose={() => setEditingMeal(null)} />
    </Screen>
  );
}
