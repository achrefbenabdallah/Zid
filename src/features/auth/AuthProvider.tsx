import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signOut as fbSignOut, type User } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { useLiveDoc } from '@/services/live';
import { ensureProfile, ref } from '@/services/data';
import { getLang, setLang } from '@/i18n';
import type { UserProfile } from '@/types';

interface AuthState {
  user: User | null;
  uid: string | null;
  profile: UserProfile | null;
  /** True until both the auth state and (if signed in) the profile doc are known. */
  loading: boolean;
  /** Firestore error code when the profile can't be created/read (e.g. rules not published). */
  profileError: string | null;
  retry: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setAuthReady(true);
      }),
    [],
  );

  // Create the profile (and seed foods) on first sign-in; re-runs on retry().
  useEffect(() => {
    setBootstrapped(false);
    setBootError(null);
    if (!user) return;
    let cancelled = false;
    ensureProfile(user.uid, user.email ?? '', user.displayName ?? user.email?.split('@')[0] ?? '', getLang())
      .then(() => !cancelled && setBootstrapped(true))
      .catch((e: { code?: string }) => {
        console.error('Failed to create profile', e);
        if (!cancelled) setBootError(e.code ?? 'unknown');
      });
    return () => {
      cancelled = true;
    };
  }, [user, attempt]);

  const uid = user?.uid ?? null;
  const profileDoc = useLiveDoc<UserProfile>(() => (uid && bootstrapped ? ref.user(uid) : null), `profile:${uid}:${bootstrapped}`);

  // The profile's language wins on a new device; local choice is kept in sync by setLang.
  useEffect(() => {
    const lang = profileDoc.data?.language;
    if (lang && lang !== getLang()) setLang(lang);
  }, [profileDoc.data?.language]);

  const profileError = bootError ?? ((profileDoc.error as { code?: string } | undefined)?.code ?? null);
  const loading = !profileError && (!authReady || (!!user && (!bootstrapped || profileDoc.loading)));

  return (
    <AuthContext.Provider
      value={{ user, uid, profile: profileDoc.data, loading, profileError, retry: () => setAttempt((n) => n + 1), signOut: () => fbSignOut(auth) }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** For screens rendered behind the auth gate — uid and profile are guaranteed. */
export function useSession() {
  const { uid, profile, user } = useAuth();
  if (!uid || !profile || !user) throw new Error('useSession used outside a signed-in route');
  return { uid, profile, user };
}
