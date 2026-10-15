import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Bookmark, BookmarkPlus, Camera, ImagePlus, Info, MessageSquareText, Plus, ScanBarcode, Search, Star } from 'lucide-react';
import { Screen, Spinner } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { useSession } from '@/features/auth/AuthProvider';
import { addMealEntries, findFoodByBarcode, markSavedMealUsed, saveFood, useFoods, useSavedMeals } from '@/services/data';
import { analyzeMealPhoto, describeMeal, VisionError, type DetectedFood } from '@/services/foodVision';
import { lookupBarcode } from '@/services/openFoodFacts';
import { makeThumbnail, resizeImage } from '@/lib/image';
import { sumMacros, toPer100g, uid as newId } from '@/lib/macros';
import { foodLabel, findByName, sortFoods } from '@/lib/foods';
import { toDateKey } from '@/lib/dates';
import { MEAL_TYPES, type Food, type MealEntry, type MealType, type SavedMeal } from '@/types';
import { FoodList } from '@/features/foods/FoodList';
import { FoodForm, type FoodDraft } from '@/features/foods/FoodForm';
import { BarcodeScanner } from './BarcodeScanner';
import { DescribeMeal } from './DescribeMeal';
import { ReviewItem } from './ReviewItem';
import { MacroLine } from './MacroLine';
import { SavedMealSheet, type SavedMealDraft } from './SavedMealSheet';
import { defaultMealType, itemMacros, type DraftItem } from './draft';

type Step = 'choose' | 'describe' | 'analyzing' | 'scan' | 'review';

export default function AddMealPage() {
  const { t, i18n } = useTranslation();
  const { uid } = useSession();
  const nav = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const date = params.get('d') ?? toDateKey();
  const foods = useFoods();

  const [step, setStep] = useState<Step>('choose');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [mealType, setMealType] = useState<MealType>(defaultMealType());
  const [photo, setPhoto] = useState<{ file: Blob; preview: string } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [foodForm, setFoodForm] = useState<FoodDraft | null>(null);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const savedMeals = useSavedMeals();
  const [usedSavedMealId, setUsedSavedMealId] = useState<string | null>(null);
  const [saveAs, setSaveAs] = useState<SavedMealDraft | null>(null);
  // Most used first, then most recent, then alphabetical.
  const sortedSaved = useMemo(
    () =>
      [...savedMeals.data].sort(
        (a, b) => (b.useCount ?? 0) - (a.useCount ?? 0) || (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0) || a.name.localeCompare(b.name),
      ),
    [savedMeals.data],
  );

  /** Load a saved meal into the review (grams still editable before saving). */
  const addSavedMeal = (sm: SavedMeal) => {
    setItems((xs) => [
      ...xs,
      ...sm.items.map(
        (it): DraftItem => ({ key: newId(), name: it.foodName, grams: it.grams, per100g: toPer100g(it, it.grams), foodId: it.foodId, origin: 'food' }),
      ),
    ]);
    if (sm.mealType) setMealType(sm.mealType);
    setUsedSavedMealId(sm.id);
    setStep('review');
  };

  const openSaveAs = () =>
    setSaveAs({
      name: '',
      mealType,
      items: items
        .filter((i) => i.name.trim() && i.grams > 0)
        .map((i) => ({ foodName: i.name.trim(), foodId: i.foodId, grams: Math.round(i.grams), ...itemMacros(i) })),
    });

  // Deep links from Today's protein ideas: /meal/new?food=<id>&g=<grams> or ?saved=<id>.
  const prefillDone = useRef(false);
  useEffect(() => {
    if (prefillDone.current) return;
    const foodId = params.get('food');
    const savedId = params.get('saved');
    if (!foodId && !savedId) return void (prefillDone.current = true);
    if (foodId && !foods.loading) {
      prefillDone.current = true;
      const food = foods.data.find((f) => f.id === foodId);
      if (food) addFood(food, Math.max(1, Number(params.get('g')) || 100));
    } else if (savedId && !savedMeals.loading) {
      prefillDone.current = true;
      const sm = savedMeals.data.find((s) => s.id === savedId);
      if (sm) addSavedMeal(sm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foods.loading, savedMeals.loading]);

  const favorites = useMemo(() => sortFoods(foods.data.filter((f) => f.favorite), i18n.language).slice(0, 8), [foods.data, i18n.language]);
  const totals = useMemo(() => sumMacros(items.map(itemMacros)), [items]);
  const hasAi = items.some((i) => i.origin === 'ai') || !!photo;

  const addFood = (food: Food, grams = 100, origin: DraftItem['origin'] = 'food') => {
    setItems((xs) => [
      ...xs,
      { key: newId(), name: foodLabel(food, i18n.language), nameAr: food.nameAr, grams, per100g: food.per100g, foodId: food.id, origin },
    ]);
    setStep('review');
  };

  // ── Photo ──────────────────────────────────────────────────────────────────
  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhoto({ file, preview: URL.createObjectURL(file) });
    setStep('analyzing');
    await runAnalysis(file);
  };

  const runAnalysis = async (file: Blob) => {
    setAiError(null);
    setStep('analyzing');
    try {
      const small = await resizeImage(file, 1024, 0.8);
      applyDetected(await analyzeMealPhoto(small));
    } catch (e) {
      console.error(e);
      setAiError(e instanceof VisionError && (e.status === 429 || e.status === 503) ? t('meals.busy') : t('meals.analyzeFailed'));
    }
    setStep('review');
  };

  // ── Text / voice description ───────────────────────────────────────────────
  const runDescribe = async (text: string) => {
    setDescription(text);
    setAiError(null);
    setStep('analyzing');
    try {
      applyDetected(await describeMeal(text));
    } catch (e) {
      console.error(e);
      setAiError(e instanceof VisionError && (e.status === 429 || e.status === 503) ? t('meals.busy') : t('describe.failed'));
    }
    setStep('review');
  };

  /** AI results replace earlier AI items; foods you added yourself stay. */
  function applyDetected(detected: DetectedFood[]) {
    if (!detected.length) setAiError(t('meals.noFoodFound'));
    setItems((xs) => [
      ...xs.filter((x) => x.origin !== 'ai'),
      ...detected.map((d): DraftItem => {
        const match = findByName(foods.data, d.name, d.nameAr);
        return {
          key: newId(),
          name: i18n.language === 'ar' && d.nameAr ? d.nameAr : d.name,
          nameAr: d.nameAr,
          grams: d.grams,
          per100g: toPer100g(d, d.grams),
          foodId: match?.id,
          origin: 'ai',
          confidence: d.confidence,
        };
      }),
    ]);
  }

  // ── Barcode ────────────────────────────────────────────────────────────────
  const onBarcode = async (code: string) => {
    setScanStatus(t('barcode.lookingUp', { code }));
    try {
      const own = await findFoodByBarcode(uid, code);
      if (own) return addFood(own, 100, 'barcode');
      const product = await lookupBarcode(code);
      if (product?.per100g) {
        // Cache in My Foods so the next scan is instant and works offline.
        const food: Omit<Food, 'id'> = {
          name: product.name,
          per100g: product.per100g,
          barcode: product.barcode,
          favorite: false,
          source: 'off',
          createdAt: Date.now(),
        };
        const id = await saveFood(uid, food);
        return addFood({ ...food, id }, product.servingGrams ?? 100, 'barcode');
      }
      toast(product ? t('barcode.noMacros') : t('barcode.notFound', { code }));
      setFoodForm({ name: product?.name ?? '', barcode: code, source: product ? 'off' : 'user' });
    } catch {
      toast(t('common.error'), 'error');
    } finally {
      setScanStatus(null);
    }
  };

  // ── Review actions ─────────────────────────────────────────────────────────
  const update = (key: string, next: DraftItem) => setItems((xs) => xs.map((x) => (x.key === key ? next : x)));
  const remove = (key: string) => setItems((xs) => xs.filter((x) => x.key !== key));

  const saveItemToFoods = async (item: DraftItem) => {
    const id = await saveFood(uid, {
      name: item.name.trim(),
      nameAr: item.nameAr,
      per100g: item.per100g,
      favorite: false,
      source: item.origin === 'ai' ? 'ai' : 'user',
      createdAt: Date.now(),
    });
    update(item.key, { ...item, foodId: id });
  };

  const save = async () => {
    const valid = items.filter((i) => i.name.trim() && i.grams > 0);
    if (!valid.length) return toast(t('meals.noItems'), 'error');
    setSaving(true);
    setSaveError(null);
    const groupId = newId();
    const now = Date.now();
    const build = (photoId?: string): Omit<MealEntry, 'id'>[] =>
      valid.map((i, idx) => ({
        date,
        loggedAt: now + idx,
        mealType,
        foodName: i.name.trim(),
        foodId: i.foodId,
        grams: Math.round(i.grams),
        ...itemMacros(i),
        groupId,
        photoId,
      }));
    const leave = (message = t('meals.saved')) => {
      if (usedSavedMealId) void markSavedMealUsed(uid, usedSavedMealId).catch(() => undefined);
      toast(message, 'success');
      nav(date === toDateKey() ? '/' : `/?d=${date}`, { replace: true });
    };
    const report = (e: unknown) => toast(`${t('meals.saveFailed')} (${(e as { code?: string }).code ?? (e as Error).message})`, 'error');

    try {
      let dataUrl: string | null = null;
      if (photo) dataUrl = await makeThumbnail(photo.file).catch(() => null); // a photo problem never blocks the meal
      const photoId = dataUrl ? newId() : undefined;
      const thumb = dataUrl ? { id: photoId!, date, dataUrl } : undefined;

      // Offline: Firestore queues the write and syncs later — don't wait for the server.
      if (!navigator.onLine) {
        void addMealEntries(uid, build(photoId), thumb).catch(report);
        return leave();
      }
      // Online: wait for the server so a rejected write is reported here, with the edits
      // still on screen, instead of after we've navigated away.
      const write = addMealEntries(uid, build(photoId), thumb);
      const outcome = await Promise.race([write.then(() => 'ok' as const), new Promise<'slow'>((r) => setTimeout(() => r('slow'), 10_000))]).catch(
        (e: unknown) => e,
      );
      if (outcome === 'ok') return leave();
      if (outcome === 'slow') {
        void write.catch(report); // slow network: it's queued; report only if it's later rejected
        return leave();
      }
      if (thumb) {
        // The batch is atomic, so nothing was written — retry once without the photo.
        await addMealEntries(uid, build(undefined));
        return leave(t('meals.savedNoPhoto'));
      }
      throw outcome;
    } catch (e) {
      console.error('Saving meal failed', e);
      setSaveError(`${t('meals.saveFailed')} (${(e as { code?: string }).code ?? (e as Error).message})`);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const fileInputs = (
    <>
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void onPhoto(e.target.files?.[0])} />
      <input ref={galleryInput} type="file" accept="image/*" hidden onChange={(e) => void onPhoto(e.target.files?.[0])} />
    </>
  );

  const title = step === 'scan' ? t('barcode.title') : step === 'review' ? t('meals.review') : step === 'describe' ? t('describe.title') : t('meals.addMeal');

  return (
    <Screen title={title} back>
      {fileInputs}

      {step === 'choose' && (
        <div className="space-y-3">
          <button onClick={() => cameraInput.current?.click()} className="card flex w-full items-center gap-4 border-accent/60 bg-accent/10 text-start">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent text-accent-ink">
              <Camera size={24} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{t('meals.takePhoto')}</span>
              <span className="block text-sm text-muted">{t('meals.photoHint')}</span>
            </span>
          </button>
          <button onClick={() => setStep('describe')} className="card flex w-full items-center gap-4 text-start">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand/15 text-brand">
              <MessageSquareText size={24} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{t('describe.title')}</span>
              <span className="block text-sm text-muted">{t('describe.tileHint')}</span>
            </span>
          </button>
          <div className="grid grid-cols-3 gap-3">
            <ChooseTile Icon={ImagePlus} label={t('meals.choosePhoto')} onClick={() => galleryInput.current?.click()} />
            <ChooseTile Icon={Search} label={t('meals.manual')} onClick={() => setPickerOpen(true)} />
            <ChooseTile Icon={ScanBarcode} label={t('meals.barcode')} onClick={() => setStep('scan')} />
          </div>

          {sortedSaved.length > 0 && (
            <section className="pt-3">
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted">
                <Bookmark size={14} /> {t('savedMeals.title')}
              </h2>
              <div className="space-y-2">
                {sortedSaved.slice(0, 6).map((sm) => (
                  <button key={sm.id} className="card flex w-full items-center gap-3 p-3 text-start" onClick={() => addSavedMeal(sm)}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{sm.name}</span>
                      <span className="block truncate text-xs text-muted">{sm.items.map((it) => it.foodName).join(' · ')}</span>
                    </span>
                    <span className="num shrink-0 text-sm font-semibold">
                      {sumMacros(sm.items).kcal} <span className="text-xs font-normal text-muted">{t('common.kcal')}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {favorites.length > 0 && (
            <section className="pt-3">
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted">
                <Star size={14} /> {t('foods.quickAdd')}
              </h2>
              <div className="flex flex-wrap gap-2">
                {favorites.map((f) => (
                  <button key={f.id} className="chip" onClick={() => addFood(f)}>
                    <Plus size={14} /> {foodLabel(f, i18n.language)}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {step === 'describe' && <DescribeMeal initial={description} onSubmit={(text) => void runDescribe(text)} />}

      {step === 'analyzing' && (
        <div>
          {photo && <img src={photo.preview} alt="" className="aspect-[4/3] w-full rounded-3xl object-cover opacity-70" />}
          <Spinner label={t('meals.analyzing')} />
        </div>
      )}

      {step === 'scan' && <BarcodeScanner onCode={(c) => void onBarcode(c)} busyText={scanStatus} />}

      {step === 'review' && (
        <div className="space-y-3">
          {photo && <img src={photo.preview} alt="" className="aspect-[16/9] w-full rounded-3xl object-cover" />}
          {!photo && description && (
            <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-muted" dir="auto">
              “{description}”
            </p>
          )}

          {hasAi && (
            <p className="flex gap-2 rounded-xl bg-carbs/15 px-3 py-2.5 text-sm">
              <Info size={18} className="mt-0.5 shrink-0 text-carbs" />
              {t('meals.approx')}
            </p>
          )}
          {aiError && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-danger/10 px-3 py-2.5 text-sm text-danger">
              <span>{aiError}</span>
              {photo ? (
                <button className="btn-ghost shrink-0 py-1.5" onClick={() => void runAnalysis(photo.file)}>
                  {t('common.retry')}
                </button>
              ) : (
                description && (
                  <button className="btn-ghost shrink-0 py-1.5" onClick={() => setStep('describe')}>
                    {t('common.edit')}
                  </button>
                )
              )}
            </div>
          )}

          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label={t('meals.mealType')}>
            {MEAL_TYPES.map((m) => (
              <button key={m} role="radio" aria-checked={mealType === m} className={mealType === m ? 'chip-active' : 'chip'} onClick={() => setMealType(m)}>
                {t(`mealTypes.${m}`)}
              </button>
            ))}
          </div>

          {items.map((item) => (
            <ReviewItem
              key={item.key}
              item={item}
              onChange={(next) => update(item.key, next)}
              onRemove={() => remove(item.key)}
              onSaveToFoods={item.origin === 'ai' || item.origin === 'custom' ? () => void saveItemToFoods(item).catch((e: { code?: string; message?: string }) => toast(`${t('common.error')} (${e.code ?? e.message})`, 'error')) : undefined}
            />
          ))}

          {items.length > 0 && (
            <button className="btn-ghost w-full" onClick={openSaveAs}>
              <BookmarkPlus size={16} /> {t('savedMeals.saveAs')}
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-ghost" onClick={() => setPickerOpen(true)}>
              <Search size={16} /> {t('meals.pickFood')}
            </button>
            <button
              className="btn-ghost"
              onClick={() =>
                setItems((xs) => [...xs, { key: newId(), name: '', grams: 100, per100g: { kcal: 0, protein: 0, carbs: 0, fat: 0 }, origin: 'custom' }])
              }
            >
              <Plus size={16} /> {t('meals.addItem')}
            </button>
          </div>

          <div className="sticky bottom-0 -mx-4 mt-2 border-t border-line bg-bg/95 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">{t('common.total')}</span>
              <MacroLine m={totals} />
            </div>
            {saveError && (
              <p className="mb-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
                {saveError}
              </p>
            )}
            <button className="btn-primary w-full py-3 text-base" disabled={saving || items.length === 0} onClick={() => void save()}>
              {t('meals.saveMeal')}
            </button>
          </div>
        </div>
      )}

      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} title={t('meals.pickFood')}>
        <FoodList
          autoFocus
          onSelect={(f) => {
            setPickerOpen(false);
            addFood(f);
          }}
        />
        <button className="btn-ghost mt-3 w-full" onClick={() => { setPickerOpen(false); setFoodForm({}); }}>
          <Plus size={16} /> {t('foods.add')}
        </button>
      </Sheet>

      <SavedMealSheet initial={saveAs} onClose={() => setSaveAs(null)} />
      <FoodForm initial={foodForm} onClose={() => setFoodForm(null)} onSaved={(f) => addFood(f, 100, f.barcode ? 'barcode' : 'food')} />
    </Screen>
  );
}

function ChooseTile({ Icon, label, onClick }: { Icon: typeof Camera; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card flex flex-col items-center gap-2 px-2 py-4 text-center text-xs font-semibold">
      <Icon size={24} className="text-brand" />
      {label}
    </button>
  );
}
