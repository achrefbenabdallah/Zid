import { NavLink, Outlet, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Apple, Dumbbell, House, LineChart, Plus } from 'lucide-react';
import { useOnline } from '@/lib/useOnline';
import { useSession } from '@/features/auth/AuthProvider';
import { useReminders } from '@/services/reminders';

const TABS = [
  { to: '/', key: 'today', Icon: House, end: true },
  { to: '/food', key: 'food', Icon: Apple },
  null, // centre slot: add-meal button
  { to: '/train', key: 'train', Icon: Dumbbell },
  { to: '/progress', key: 'progress', Icon: LineChart },
] as const;

export function AppShell() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const online = useOnline();
  const { uid, profile } = useSession();
  useReminders(uid, profile.reminders);

  return (
    <div className="min-h-dvh pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
      {!online && <div className="bg-carbs/90 px-4 py-1.5 text-center text-xs font-semibold text-black">{t('common.offline')}</div>}
      <Outlet />
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid max-w-2xl grid-cols-5 items-end">
          {TABS.map((tab) =>
            tab === null ? (
              <div key="add" className="flex justify-center">
                <button
                  onClick={() => nav('/meal/new')}
                  className="-mt-6 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-ink shadow-lg shadow-black/20 transition active:scale-95"
                  aria-label={t('meals.addMeal')}
                >
                  <Plus size={28} strokeWidth={2.6} />
                </button>
              </div>
            ) : (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={'end' in tab}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${isActive ? 'text-brand' : 'text-muted'}`
                }
              >
                <tab.Icon size={22} />
                {t(`nav.${tab.key}`)}
              </NavLink>
            ),
          )}
        </div>
      </nav>
    </div>
  );
}
