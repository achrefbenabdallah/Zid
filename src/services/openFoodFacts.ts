/**
 * Open Food Facts product lookup (free, no key). Data licence: ODbL — attribution shown in the scanner UI.
 * https://openfoodfacts.github.io/openfoodfacts-server/api/
 */
import type { Macros } from '@/types';

export interface OffProduct {
  barcode: string;
  name: string;
  brand?: string;
  per100g: Macros | null;
  servingGrams?: number;
  image?: string;
}

const FIELDS = 'product_name,product_name_fr,product_name_en,product_name_ar,brands,nutriments,serving_quantity,image_front_small_url';

export async function lookupBarcode(barcode: string): Promise<OffProduct | null> {
  const code = barcode.replace(/\D/g, '');
  if (code.length < 6) return null;
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${FIELDS}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Open Food Facts HTTP ${res.status}`);
  const data = (await res.json()) as { status?: number; product?: Record<string, unknown> };
  if (data.status !== 1 || !data.product) return null;

  const p = data.product;
  const nut = (p.nutriments ?? {}) as Record<string, number | string | undefined>;
  const num = (k: string) => {
    const v = Number(nut[k]);
    return Number.isFinite(v) && v >= 0 ? v : undefined;
  };
  // Some products only have kJ.
  const kcal = num('energy-kcal_100g') ?? (num('energy_100g') !== undefined ? num('energy_100g')! / 4.184 : undefined);
  const protein = num('proteins_100g');
  const carbs = num('carbohydrates_100g');
  const fat = num('fat_100g');

  const str = (k: string) => (typeof p[k] === 'string' && (p[k] as string).trim() ? (p[k] as string).trim() : undefined);
  const brand = str('brands')?.split(',')[0]?.trim();
  const baseName = str('product_name') ?? str('product_name_fr') ?? str('product_name_en') ?? str('product_name_ar') ?? `#${code}`;
  const serving = Number(p.serving_quantity);

  return {
    barcode: code,
    name: brand && !baseName.toLowerCase().includes(brand.toLowerCase()) ? `${baseName} (${brand})` : baseName,
    brand,
    per100g:
      kcal !== undefined
        ? { kcal: Math.round(kcal), protein: protein ?? 0, carbs: carbs ?? 0, fat: fat ?? 0 }
        : null,
    servingGrams: Number.isFinite(serving) && serving > 0 ? serving : undefined,
    image: str('image_front_small_url'),
  };
}
