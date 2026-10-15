import { fromDateKey } from './dates';

/** After this many days without a weigh-in, Today asks for one. */
export const WEIGH_IN_NUDGE_DAYS = 3;

export interface WeighInStatus {
  /** Show the quick weigh-in card. */
  due: boolean;
  /** Days since the last weigh-in, null if there is none. */
  daysAgo: number | null;
  /** Today is one of the chosen weigh-in days. */
  scheduledToday: boolean;
}

const dayMs = 86_400_000;

/** Days between two "YYYY-MM-DD" keys (DST-safe). */
export function daysBetween(from: string, to: string): number {
  return Math.round((fromDateKey(to).getTime() - fromDateKey(from).getTime()) / dayMs);
}

/** 0 = Sunday … 6 = Saturday, like Date.getDay(). */
export function weekdayOf(key: string): number {
  return fromDateKey(key).getDay();
}

/**
 * Due when you never weighed in, haven't for WEIGH_IN_NUDGE_DAYS days, or today is a chosen
 * weigh-in day and you haven't logged yet.
 */
export function weighInStatus(lastDate: string | undefined, today: string, days: number[] = []): WeighInStatus {
  const scheduledToday = days.includes(weekdayOf(today));
  if (!lastDate) return { due: true, daysAgo: null, scheduledToday };
  const daysAgo = Math.max(0, daysBetween(lastDate, today));
  return { due: daysAgo >= WEIGH_IN_NUDGE_DAYS || (scheduledToday && daysAgo > 0), daysAgo, scheduledToday };
}
