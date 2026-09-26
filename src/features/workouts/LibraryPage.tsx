import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { MUSCLE_GROUPS } from '@/data/exercises';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import type { Exercise, MuscleGroup } from '@/types';
import { ExerciseBrowser, ExerciseDetail } from './ExerciseViews';

export default function LibraryPage() {
  const { t } = useTranslation();
  const [open, setOpen] = useState<Exercise | null>(null);
  const g = useSearchParams()[0].get('g') as MuscleGroup | null;
  const initialGroup = g && MUSCLE_GROUPS.includes(g) ? g : 'all';
  return (
    <Screen title={t('workouts.library')} back>
      <ExerciseBrowser onPick={setOpen} initialGroup={initialGroup} />
      <ExerciseDetail exercise={open} onClose={() => setOpen(null)} />
    </Screen>
  );
}
