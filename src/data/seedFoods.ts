import type { Macros } from '@/types';

/**
 * Starter food library copied into each new user's "My Foods" at signup.
 * Values are per 100 g (cooked where noted), rounded from USDA FoodData Central,
 * CIQUAL and typical Tunisian recipes. Homemade dishes vary a lot — users can edit.
 */
export interface SeedFood {
  key: string;
  name: string;
  nameAr: string;
  per100g: Macros;
}

const f = (key: string, name: string, nameAr: string, kcal: number, protein: number, carbs: number, fat: number): SeedFood => ({
  key,
  name,
  nameAr,
  per100g: { kcal, protein, carbs, fat },
});

export const SEED_FOODS: SeedFood[] = [
  // Protein
  f('chicken-breast', 'Chicken breast (cooked)', 'صدر دجاج (مطبوخ)', 165, 31, 0, 3.6),
  f('chicken-thigh', 'Chicken thigh (cooked)', 'فخذ دجاج (مطبوخ)', 209, 26, 0, 10.9),
  f('turkey-escalope', 'Turkey escalope (cooked)', 'إسكالوب ديك رومي (مطبوخ)', 135, 30, 0, 1.5),
  f('beef-lean', 'Lean ground beef (cooked)', 'لحم بقري مفروم (مطبوخ)', 250, 26, 0, 15),
  f('lamb', 'Lamb (cooked)', 'لحم علوش (مطبوخ)', 294, 25, 0, 21),
  f('merguez', 'Merguez', 'مرقاز', 300, 16, 1, 26),
  f('tuna-water', 'Tuna, canned in water', 'تن في الماء', 116, 26, 0, 1),
  f('tuna-oil', 'Tuna, canned in oil (drained)', 'تن في الزيت (مصفّى)', 198, 29, 0, 8.2),
  f('sardines', 'Sardines in oil', 'سردينة في الزيت', 208, 25, 0, 11.5),
  f('salmon', 'Salmon (cooked)', 'سلمون (مطبوخ)', 208, 20, 0, 13),
  f('egg', 'Whole egg', 'عظمة (بيضة كاملة)', 143, 12.6, 0.7, 9.5),
  f('egg-white', 'Egg white', 'بياض العظم', 52, 11, 0.7, 0.2),
  f('whey', 'Whey protein powder', 'بروتين واي', 400, 78, 8, 6),

  // Dairy
  f('lben', 'Lben (fermented milk)', 'لبن', 42, 3.3, 4.8, 1),
  f('milk', 'Whole milk', 'حليب كامل', 61, 3.2, 4.8, 3.3),
  f('yogurt', 'Plain yogurt', 'ياغورت طبيعي', 61, 3.5, 4.7, 3.3),
  f('yopro', 'YOPRO high-protein yogurt', 'ياغورت YOPRO', 57, 10, 3.9, 0.2),
  f('greek-yogurt', 'Greek yogurt 0%', 'ياغورت يوناني 0%', 59, 10, 3.6, 0.4),
  f('cheese-triangles', 'Processed cheese triangles', 'جبن مثلثات', 240, 10, 6, 19.5),
  f('ricotta', 'Ricotta', 'ريكوتا', 174, 11, 3, 13),

  // Bread & grains
  f('tabouna', 'Tabouna bread', 'خبز طابونة', 270, 8.5, 54, 2),
  f('baguette', 'Baguette', 'خبز باقات', 270, 9, 55, 1.5),
  f('mlawi', 'Mlawi', 'ملاوي', 320, 7, 45, 12),
  f('couscous', 'Couscous (cooked, plain)', 'كسكسي (مطبوخ، بدون مرق)', 112, 3.8, 23, 0.2),
  f('couscous-dish', 'Couscous with meat & vegetables', 'كسكسي بالخضرة واللحم', 150, 7, 20, 4.5),
  f('rice', 'White rice (cooked)', 'روز أبيض (مطبوخ)', 130, 2.7, 28, 0.3),
  f('pasta', 'Pasta (cooked)', 'مقرونة (مطبوخة)', 158, 5.8, 31, 0.9),
  f('oats', 'Oats (dry)', 'شوفان', 389, 16.9, 66, 6.9),
  f('potato', 'Potato (boiled)', 'بطاطا (مسلوقة)', 87, 1.9, 20, 0.1),
  f('fries', 'French fries', 'بطاطا مقلية', 312, 3.4, 41, 15),

  // Tunisian dishes
  f('brik', "Brik à l'œuf", 'بريك بالعظم', 250, 9, 18, 16),
  f('chakchouka', 'Chakchouka', 'شكشوكة', 90, 4, 6, 6),
  f('lablabi', 'Lablabi', 'لبلابي', 110, 6, 15, 3),
  f('ojja-merguez', 'Ojja with merguez', 'عجة بالمرقاز', 150, 8, 5, 11),
  f('fricasse', 'Fricassé', 'فريكاسي', 280, 8, 30, 14),
  f('salade-tunisienne', 'Tunisian salad', 'سلاطة تونسية', 50, 1.2, 5, 3),
  f('mechouia', 'Mechouia salad', 'سلاطة مشوية', 80, 1.5, 6, 6),
  f('harissa', 'Harissa', 'هريسة', 70, 3, 8, 3),
  f('chamia', 'Chamia (halva)', 'شامية', 516, 12.5, 60, 26),
  f('makroudh', 'Makroudh', 'مقروض', 400, 4, 60, 16),
  f('bambalouni', 'Bambalouni', 'بمبالوني', 360, 6, 45, 17),

  // Legumes
  f('chickpeas', 'Chickpeas (cooked)', 'حمص (مطبوخ)', 164, 8.9, 27, 2.6),
  f('lentils', 'Lentils (cooked)', 'عدس (مطبوخ)', 116, 9, 20, 0.4),
  f('white-beans', 'White beans / loubia (cooked)', 'لوبيا (مطبوخة)', 139, 9.7, 25, 0.4),

  // Fruit & veg
  f('dates', 'Dates (Deglet Nour)', 'تمر (دقلة نور)', 282, 2.5, 75, 0.4),
  f('banana', 'Banana', 'بنان', 89, 1.1, 23, 0.3),
  f('apple', 'Apple', 'تفاح', 52, 0.3, 14, 0.2),
  f('orange', 'Orange', 'برتقال', 47, 0.9, 12, 0.1),
  f('watermelon', 'Watermelon', 'دلاع', 30, 0.6, 8, 0.2),
  f('tomato', 'Tomato', 'طماطم', 18, 0.9, 3.9, 0.2),
  f('cucumber', 'Cucumber', 'فقوس / خيار', 15, 0.7, 3.6, 0.1),

  // Fats, nuts, sweets
  f('olive-oil', 'Olive oil', 'زيت زيتون', 884, 0, 0, 100),
  f('almonds', 'Almonds', 'لوز', 579, 21, 22, 50),
  f('peanut-butter', 'Peanut butter', 'زبدة الكاكاوية', 588, 25, 20, 50),
  f('honey', 'Honey', 'عسل', 304, 0.3, 82, 0),
  f('sugar', 'Sugar', 'سكر', 387, 0, 100, 0),
];
