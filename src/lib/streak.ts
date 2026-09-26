import { addDays } from './dates';

/**
 * Consecutive logged days ending today. If today has nothing yet, the streak
 * still counts up to yesterday (you haven't broken it until the day is over).
 */
export function computeStreak(loggedDays: Set<string>, today: string): number {
  let day = loggedDays.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (loggedDays.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}
