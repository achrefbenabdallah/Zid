import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { LoginPage } from '@/features/auth/LoginPage';
import { firebaseConfigured } from '@/services/firebase';
import { ToastProvider } from '@/components/Toast';
import { Spinner } from '@/components/Screen';
import { Logo } from '@/components/Logo';
import { AppShell } from './AppShell';
import { TodayPage } from '@/features/today/TodayPage';

// Heavier screens are split out so the first paint (Today) stays small.
const AddMealPage = lazy(() => import('@/features/meals/AddMealPage'));
const FoodsPage = lazy(() => import('@/features/foods/FoodsPage'));
const TrainPage = lazy(() => import('@/features/workouts/TrainPage'));
const SessionPage = lazy(() => import('@/features/workouts/SessionPage'));
const LibraryPage = lazy(() => import('@/features/workouts/LibraryPage'));
const ProgressPage = lazy(() => import('@/features/progress/ProgressPage'));
const MorePage = lazy(() => import('@/features/settings/MorePage'));

function SetupScreen() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <Logo size={64} />
      <h1 className="text-2xl font-bold">{t('setup.title')}</h1>
      <p className="text-muted">{t('setup.body')}</p>
    </div>
  );
}

/** Shown when the profile can't be loaded — most often Firestore rules not published yet. */
function ProfileError({ code }: { code: string }) {
  const { t } = useTranslation();
  const { retry, signOut } = useAuth();
  const denied = code === 'permission-denied';
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <Logo size={56} />
      <h1 className="text-xl font-bold">{denied ? t('setup.deniedTitle') : t('common.error')}</h1>
      <p className="text-sm text-muted">{denied ? t('setup.deniedBody') : code}</p>
      <div className="flex gap-2">
        <button className="btn-primary" onClick={retry}>{t('common.retry')}</button>
        <button className="btn-ghost" onClick={() => void signOut()}>{t('auth.signOut')}</button>
      </div>
    </div>
  );
}

function Gate() {
  const { user, loading, profile, profileError } = useAuth();
  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner />
      </div>
    );
  }
  if (!user) return <LoginPage />;
  if (profileError || !profile) return <ProfileError code={profileError ?? 'profile-missing'} />;

  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<TodayPage />} />
          <Route path="food" element={<FoodsPage />} />
          <Route path="train" element={<TrainPage />} />
          <Route path="train/library" element={<LibraryPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="more" element={<MorePage />} />
        </Route>
        {/* Full-screen flows without the tab bar */}
        <Route path="meal/new" element={<AddMealPage />} />
        <Route path="train/session/:id?" element={<SessionPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export function App() {
  if (!firebaseConfigured) return <SetupScreen />;
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
