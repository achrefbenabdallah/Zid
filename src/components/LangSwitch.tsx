import { useTranslation } from 'react-i18next';
import { setLang } from '@/i18n';
import { useAuth } from '@/features/auth/AuthProvider';
import { updateProfile } from '@/services/data';
import type { Lang } from '@/types';

/** EN / عربي toggle. Persists locally and, when signed in, on the profile (syncs across devices). */
export function LangSwitch() {
  const { i18n } = useTranslation();
  const { uid } = useAuth();
  const change = (lang: Lang) => {
    setLang(lang);
    if (uid) void updateProfile(uid, { language: lang });
  };
  return (
    <div className="inline-flex rounded-full border border-line bg-surface p-0.5 text-sm font-semibold" role="group" aria-label="Language">
      {(['en', 'ar'] as const).map((l) => (
        <button
          key={l}
          onClick={() => change(l)}
          aria-pressed={i18n.language === l}
          className={`rounded-full px-3 py-1 ${i18n.language === l ? 'bg-ink text-bg' : 'text-muted'}`}
        >
          {l === 'en' ? 'EN' : 'عربي'}
        </button>
      ))}
    </div>
  );
}
