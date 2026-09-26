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

function Gate() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner />
      </div>
    );
  }
  if (!user) return <LoginPage />;

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
