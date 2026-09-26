import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Star } from 'lucide-react';
import { Empty, Spinner } from '@/components/Screen';
import { useFoods } from '@/services/data';
import { foodLabel, matchesQuery, sortFoods } from '@/lib/foods';
import type { Food } from '@/types';

/** Searchable food list (favorites first). Shared by the My Foods page and the meal food picker. */
export function FoodList({ onSelect, onToggleFavorite, autoFocus }: {
  onSelect: (food: Food) => void;
  onToggleFavorite?: (food: Food) => void;
  autoFocus?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const foods = useFoods();
  const [q, setQ] = useState('');
  const [favOnly, setFavOnly] = useState(false);

  const list = useMemo(
    () => sortFoods(foods.data.filter((f) => (!favOnly || f.favorite) && matchesQuery(f, q)), i18n.language),
    [foods.data, q, favOnly, i18n.language],
  );

  return (
    <div>
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          className="input ps-10"
          placeholder={t('foods.search')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus={autoFocus}
        />
      </div>
      <div className="mt-3 flex gap-2">
        <button className={!favOnly ? 'chip-active' : 'chip'} onClick={() => setFavOnly(false)}>
          {t('foods.all')} <span className="num opacity-70">{foods.data.length}</span>
        </button>
        <button className={favOnly ? 'chip-active' : 'chip'} onClick={() => setFavOnly(true)}>
          <Star size={14} /> {t('foods.favorites')}
        </button>
      </div>

      {foods.loading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <div className="mt-4">
          <Empty>{t('foods.empty')}</Empty>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {list.map((f) => (
            <li key={f.id} className="flex items-center">
              <button className="min-w-0 flex-1 px-4 py-3 text-start hover:bg-surface-2/60" onClick={() => onSelect(f)}>
                <div className="truncate text-sm font-medium">{foodLabel(f, i18n.language)}</div>
                <div className="text-xs text-muted">
                  <span className="num">{f.per100g.kcal}</span> {t('common.kcal')} · {t('macros.p')} <span className="num">{f.per100g.protein}</span> · {t('macros.c')}{' '}
                  <span className="num">{f.per100g.carbs}</span> · {t('macros.f')} <span className="num">{f.per100g.fat}</span>
                  <span className="opacity-70"> / 100{t('common.g')}</span>
                </div>
              </button>
              {onToggleFavorite && (
                <button
                  className={`p-3 ${f.favorite ? 'text-carbs' : 'text-muted/50'}`}
                  onClick={() => onToggleFavorite(f)}
                  aria-pressed={f.favorite}
                  aria-label={t('foods.favorites')}
                >
                  <Star size={18} fill={f.favorite ? 'currentColor' : 'none'} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
