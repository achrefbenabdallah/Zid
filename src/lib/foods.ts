import type { Food, Lang } from '@/types';

export function foodLabel(food: Pick<Food, 'name' | 'nameAr'>, lang: Lang | string): string {
  return lang === 'ar' && food.nameAr ? food.nameAr : food.name;
}

/** Lower-case, strip Latin accents and Arabic diacritics/tatweel so "Fricassé" ≈ "fricasse". */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}

export function matchesQuery(food: Pick<Food, 'name' | 'nameAr'>, q: string): boolean {
  const n = normalize(q);
  if (!n) return true;
  return n.split(/\s+/).every((part) => normalize(food.name).includes(part) || normalize(food.nameAr ?? '').includes(part));
}

/** Favorites first, then alphabetical in the current language. */
export function sortFoods(foods: Food[], lang: string): Food[] {
  return [...foods].sort((a, b) => Number(b.favorite) - Number(a.favorite) || foodLabel(a, lang).localeCompare(foodLabel(b, lang), lang));
}

/** Find a food whose English or Arabic name matches exactly (after normalisation). */
export function findByName(foods: Food[], name: string, nameAr?: string): Food | undefined {
  const n = normalize(name);
  const na = nameAr ? normalize(nameAr) : '';
  return foods.find((f) => normalize(f.name) === n || (na && normalize(f.nameAr ?? '') === na));
}
