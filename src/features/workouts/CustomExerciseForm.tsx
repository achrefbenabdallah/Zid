import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, ImagePlus, Trash2, X } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { useToast } from '@/components/Toast';
import { useSession } from '@/features/auth/AuthProvider';
import { deleteCustomExercise, saveCustomExercise } from '@/services/data';
import { MUSCLE_GROUPS } from '@/data/exercises';
import { customExerciseId } from '@/lib/zidFormat';
import { makeThumbnail } from '@/lib/image';
import type { CustomExercise, MuscleGroup } from '@/types';
import { CUSTOM_PREFIX } from './useExerciseCatalog';
import { useEquipmentLabel } from './equipment';

const EQUIPMENT = ['machine', 'cable', 'dumbbell', 'barbell', 'e-z curl bar', 'kettlebells', 'body only', 'other'];

export type CustomDraft = Partial<CustomExercise> & { group?: MuscleGroup };

/** Create / edit / delete a user exercise. Name → stable id, so the same name never duplicates. */
export function CustomExerciseForm({ initial, existing, onClose, onSaved }: {
  initial: CustomDraft | null;
  existing: CustomExercise[];
  onClose: () => void;
  onSaved?: (ex: CustomExercise) => void;
}) {
  const { t } = useTranslation();
  const { uid } = useSession();
  const toast = useToast();
  const eq = useEquipmentLabel();
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [f, setF] = useState<CustomDraft>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) setF({ group: 'chest', equipment: 'machine', ...initial });
    setError(null);
  }, [initial]);

  if (!initial) return null;
  const editing = !!initial.id;
  const name = (f.name ?? '').trim();

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    const photo = await makeThumbnail(file, 480).catch(() => null);
    if (photo) setF((x) => ({ ...x, photo }));
    else toast(t('common.error'), 'error');
  };

  const save = async () => {
    const id = customExerciseId(name).slice(CUSTOM_PREFIX.length);
    // Renaming changes the id; block collisions with another exercise of yours.
    if ((!editing || id !== initial.id) && existing.some((e) => e.id === id)) return setError(t('workouts.custom.exists'));
    setBusy(true);
    try {
      const ex: CustomExercise = {
        id,
        name,
        group: f.group ?? 'chest',
        equipment: f.equipment ?? 'other',
        howTo: f.howTo?.trim() || undefined,
        photo: f.photo,
        createdAt: initial.createdAt ?? Date.now(),
      };
      await saveCustomExercise(uid, ex);
      if (editing && initial.id && initial.id !== id) await deleteCustomExercise(uid, initial.id);
      onSaved?.(ex);
      onClose();
    } catch (e) {
      setError(`${t('common.error')} (${(e as { code?: string }).code ?? (e as Error).message})`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!initial.id || !confirm(t('workouts.custom.deleteConfirm'))) return;
    await deleteCustomExercise(uid, initial.id);
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={editing ? t('workouts.custom.edit') : t('workouts.custom.new')}
      footer={
        <div className="flex gap-2">
          {editing && (
            <button className="btn-danger" onClick={() => void remove()} aria-label={t('common.delete')}>
              <Trash2 size={18} />
            </button>
          )}
          <button className="btn-primary flex-1" disabled={!name || busy} onClick={() => void save()}>
            {t('common.save')}
          </button>
        </div>
      }
    >
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void onPhoto(e.target.files?.[0])} />
      <input ref={gallery} type="file" accept="image/*" hidden onChange={(e) => void onPhoto(e.target.files?.[0])} />
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="cx-name">{t('workouts.custom.name')}</label>
          <input
            id="cx-name"
            className="input"
            value={f.name ?? ''}
            maxLength={80}
            placeholder={t('workouts.custom.namePlaceholder')}
            onChange={(e) => {
              setF({ ...f, name: e.target.value });
              setError(null);
            }}
            autoFocus={!editing}
          />
        </div>

        <div>
          <span className="label">{t('workouts.custom.group')}</span>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_GROUPS.map((g) => (
              <button key={g} className={f.group === g ? 'chip-active' : 'chip'} onClick={() => setF({ ...f, group: g })} aria-pressed={f.group === g}>
                {t(`muscles.${g}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="cx-eq">{t('workouts.custom.equipment')}</label>
          <select id="cx-eq" className="input" value={f.equipment} onChange={(e) => setF({ ...f, equipment: e.target.value })}>
            {EQUIPMENT.map((k) => (
              <option key={k} value={k}>
                {eq(k)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="label">{t('workouts.custom.photo')}</span>
          {f.photo ? (
            <div className="relative">
              <img src={f.photo} alt="" className="aspect-[4/3] w-full rounded-2xl bg-white object-cover" />
              <button
                className="absolute end-2 top-2 rounded-full bg-black/60 p-1.5 text-white"
                onClick={() => setF({ ...f, photo: undefined })}
                aria-label={t('workouts.custom.removePhoto')}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-ghost" onClick={() => camera.current?.click()}>
                <Camera size={16} /> {t('meals.takePhoto')}
              </button>
              <button className="btn-ghost" onClick={() => gallery.current?.click()}>
                <ImagePlus size={16} /> {t('meals.choosePhoto')}
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="label" htmlFor="cx-how">{t('workouts.custom.howTo')}</label>
          <textarea
            id="cx-how"
            className="input min-h-20 resize-y"
            maxLength={1000}
            value={f.howTo ?? ''}
            placeholder={t('workouts.custom.howToPlaceholder')}
            onChange={(e) => setF({ ...f, howTo: e.target.value })}
          />
        </div>

        {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p>}
      </div>
    </Sheet>
  );
}
