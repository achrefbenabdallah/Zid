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
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(
    () =>
      onAuthStateChanged(auth, async (u) => {
        setUser(u);
        setAuthReady(true);
        setBootstrapped(false);
        if (u) {
          try {
            await ensureProfile(u.uid, u.email ?? '', u.displayName ?? u.email?.split('@')[0] ?? '', getLang());
          } catch (e) {
            console.error('Failed to create profile', e);
          }
          setBootstrapped(true);
        }
      }),
    [],
  );

  const uid = user?.uid ?? null;
  const profileDoc = useLiveDoc<UserProfile>(() => (uid && bootstrapped ? ref.user(uid) : null), `profile:${uid}:${bootstrapped}`);

  // The profile's language wins on a new device; local choice is kept in sync by setLang.
  useEffect(() => {
    const lang = profileDoc.data?.language;
    if (lang && lang !== getLang()) setLang(lang);
  }, [profileDoc.data?.language]);

  const loading = !authReady || (!!user && (!bootstrapped || profileDoc.loading));

  return (
    <AuthContext.Provider
      value={{ user, uid, profile: profileDoc.data, loading, signOut: () => fbSignOut(auth) }}
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
