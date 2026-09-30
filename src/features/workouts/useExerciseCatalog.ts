import { useMemo } from 'react';
import { EXERCISES } from '@/data/exercises';
import { useCustomExercises } from '@/services/data';
import type { CustomExercise, Exercise } from '@/types';

export const CUSTOM_PREFIX = 'custom:';

/** A user-created exercise in the same shape as the library ones. */
export function customToExercise(c: CustomExercise): Exercise {
  return {
    id: CUSTOM_PREFIX + c.id,
    group: c.group,
    name: c.name,
    nameAr: c.name,
    howTo: c.howTo ?? '',
    howToAr: c.howTo ?? '',
    equipment: c.equipment,
    images: [],
    custom: true,
    photo: c.photo,
  };
}

/** Library + the user's own exercises, with lookup by id. */
export function useExerciseCatalog() {
  const custom = useCustomExercises();
  return useMemo(() => {
    const mine = custom.data.map(customToExercise);
    const all = [...mine, ...EXERCISES];
    const byId = new Map(all.map((e) => [e.id, e]));
    return {
      all,
      mine,
      rawCustom: custom.data,
      get: (id: string) => byId.get(id),
    };
  }, [custom.data]);
}
