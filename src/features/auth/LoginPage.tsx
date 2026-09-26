import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  updateProfile as fbUpdateProfile,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth } from '@/services/firebase';
import { Logo } from '@/components/Logo';
import { LangSwitch } from '@/components/LangSwitch';

function errorKey(e: unknown): string {
  const code = e instanceof FirebaseError ? e.code : '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'auth.errors.invalid';
    case 'auth/email-already-in-use':
      return 'auth.errors.emailInUse';
    case 'auth/weak-password':
      return 'auth.errors.weakPassword';
    case 'auth/invalid-email':
      return 'auth.errors.invalidEmail';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'auth.errors.popup';
    case 'auth/network-request-failed':
      return 'auth.errors.network';
    case 'auth/too-many-requests':
      return 'auth.errors.tooMany';
    default:
      return 'auth.errors.generic';
  }
}

export function LoginPage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'in') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) await fbUpdateProfile(cred.user, { displayName: name.trim() });
      }
    } catch (err) {
      setError(t(errorKey(err)));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      // Installed PWAs / some mobile browsers block popups — fall back to a full redirect.
      if (err instanceof FirebaseError && (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment')) {
        await signInWithRedirect(auth, provider);
      } else {
        setError(t(errorKey(err)));
      }
    }
  };

  const reset = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim()) return setError(t('auth.enterEmailFirst'));
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfo(t('auth.resetSent', { email: email.trim() }));
    } catch (err) {
      setError(t(errorKey(err)));
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-8">
      <div className="flex justify-end">
        <LangSwitch />
      </div>
      <div className="mt-10 mb-8 flex flex-col items-center text-center">
        <Logo size={72} />
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight">{t('app.name')}</h1>
        <p className="mt-1 text-lg font-semibold" dir="rtl" lang="ar">كول بالعقل، كبّر بالجد</p>
        <p className="text-sm text-muted" dir="ltr" lang="en">Eat smart, grow hard</p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        {mode === 'up' && (
          <div>
            <label className="label" htmlFor="name">{t('auth.name')}</label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">{t('auth.email')}</label>
          <input id="email" type="email" dir="ltr" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">{t('auth.password')}</label>
          <input
            id="password"
            type="password"
            dir="ltr"
            required
            minLength={6}
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
          />
        </div>
        {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p>}
        {info && <p className="rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand">{info}</p>}
        <button className="btn-primary w-full py-3 text-base" disabled={busy}>
          {mode === 'in' ? t('auth.signIn') : t('auth.signUp')}
        </button>
        {mode === 'in' && (
          <button type="button" onClick={reset} className="w-full text-center text-sm text-muted underline-offset-2 hover:underline">
            {t('auth.forgot')}
          </button>
        )}
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-muted">
        <div className="h-px flex-1 bg-line" />
        {t('auth.or')}
        <div className="h-px flex-1 bg-line" />
      </div>

      <button onClick={google} className="btn-ghost w-full border border-line py-3 text-base">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        {t('auth.google')}
      </button>

      <p className="mt-6 text-center text-sm text-muted">
        {mode === 'in' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
        <button
          className="font-semibold text-brand"
          onClick={() => {
            setMode(mode === 'in' ? 'up' : 'in');
            setError(null);
          }}
        >
          {mode === 'in' ? t('auth.signUp') : t('auth.signIn')}
        </button>
      </p>
    </div>
  );
}
