/**
 * Meal, workout & weigh-in reminders using local notifications.
 *
 * Browsers only allow real background scheduling with a push server (FCM), which this app
 * doesn't run. So reminders are timers set while Zid is open; an installed PWA that stays
 * in memory (common on Android) keeps firing them. Missed reminders are not replayed.
 */
import { useEffect } from 'react';
import { getDocs, query, where } from 'firebase/firestore';
import i18n from '@/i18n';
import { ref } from './data';
import { toDateKey } from '@/lib/dates';
import type { ReminderSettings } from '@/types';

export type NotifyState = 'granted' | 'denied' | 'default' | 'unsupported';

export function notificationState(): NotifyState {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestNotifications(): Promise<NotifyState> {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.requestPermission();
}

/** Prefer the service worker (works when installed + on Android), fall back to the page API. */
export async function notify(title: string, body: string, url = '/') {
  if (notificationState() !== 'granted') return;
  const options = { body, icon: '/pwa-192.png', badge: '/pwa-192.png', data: { url }, tag: title };
  const reg = await navigator.serviceWorker?.getRegistration();
  if (reg) await reg.showNotification(title, options);
  else new Notification(title, options);
}

function msUntil(hhmm: string, now: Date): number {
  const [h, m] = hhmm.split(':').map(Number);
  const at = new Date(now);
  at.setHours(h, m, 0, 0);
  return at.getTime() - now.getTime();
}

/** Once per reminder slot per day, even with several tabs open. */
function claim(slot: string): boolean {
  const key = `zid.reminded.${toDateKey()}.${slot}`;
  try {
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, '1');
  } catch {
    /* storage blocked: allow */
  }
  return true;
}

export function useReminders(uid: string, settings: ReminderSettings) {
  const key = JSON.stringify(settings);

  useEffect(() => {
    if (!settings.enabled || notificationState() !== 'granted') return;
    const timers: number[] = [];

    const schedule = () => {
      timers.splice(0).forEach(clearTimeout);
      const now = new Date();
      for (const time of settings.meals) {
        const ms = msUntil(time, now);
        if (ms > 0)
          timers.push(
            window.setTimeout(() => {
              if (claim(`meal-${time}`)) void notify(i18n.t('settings.mealReminder'), i18n.t('settings.mealReminderBody'), '/meal/new');
            }, ms),
          );
      }
      if (settings.workout) {
        const ms = msUntil(settings.workout, now);
        if (ms > 0)
          timers.push(
            window.setTimeout(async () => {
              // Skip if a workout is already logged today.
              const done = await getDocs(query(ref.workouts(uid), where('date', '==', toDateKey())));
              if (done.empty && claim('workout'))
                void notify(i18n.t('settings.workoutReminder'), i18n.t('settings.workoutReminderBody'), '/train/session');
            }, ms),
          );
      }
      const weighIn = settings.weighIn;
      if (weighIn && weighIn.days.includes(now.getDay())) {
        const ms = msUntil(weighIn.time, now);
        if (ms > 0)
          timers.push(
            window.setTimeout(async () => {
              // Skip if you already weighed in today.
              const done = await getDocs(query(ref.weights(uid), where('date', '==', toDateKey())));
              if (done.empty && claim('weighIn'))
                void notify(i18n.t('settings.weighInReminder'), i18n.t('settings.weighInReminderBody'), '/');
            }, ms),
          );
      }
      // Re-plan just after midnight for the next day.
      timers.push(window.setTimeout(schedule, msUntil('24:00', now) + 1000));
    };

    schedule();
    // Timers drift or die while a phone sleeps; re-plan whenever the app comes back.
    const onVisible = () => document.visibilityState === 'visible' && schedule();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      timers.forEach(clearTimeout);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, key]);
}
