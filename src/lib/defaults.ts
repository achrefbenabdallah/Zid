import type { Goals, MetSettings, ReminderSettings } from '@/types';

export const DEFAULT_GOALS: Goals = {
  kcal: 2900,
  kcalTraining: 3100,
  protein: 145,
  carbs: 420,
  fat: 70,
  waterMl: 3000,
};

/** Defaults for the workout calorie estimate — documented in README "Calories burned". */
export const DEFAULT_MET: MetSettings = {
  minutesPerSet: 2.5,
  light: 3.5,
  moderate: 5.0,
  hard: 6.0,
};

export const DEFAULT_REMINDERS: ReminderSettings = {
  enabled: false,
  meals: ['08:00', '13:00', '20:00'],
  workout: '18:00',
  // Mon / Wed / Fri: enough weigh-ins for the adaptive calorie target.
  weighIn: { time: '07:30', days: [1, 3, 5] },
};
