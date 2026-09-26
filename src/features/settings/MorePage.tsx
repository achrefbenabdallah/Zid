import { useTranslation } from 'react-i18next';
import { LogOut } from 'lucide-react';
import { Screen } from '@/components/Screen';
import { LangSwitch } from '@/components/LangSwitch';
import { useAuth } from '@/features/auth/AuthProvider';

// Stage-1 version: language + sign out. Goals, reminders, export come in a later stage.
export default function MorePage() {
  const { t } = useTranslation();
  const { signOut, user } = useAuth();
  return (
    <Screen title={t('nav.more')} back menu={false}>
      <div className="card flex items-center justify-between">
        <span className="text-sm text-muted" dir="ltr">{user?.email}</span>
        <LangSwitch />
      </div>
      <button className="btn-danger mt-4 w-full" onClick={() => void signOut()}>
        <LogOut size={16} className="flip-rtl" /> {t('auth.signOut')}
      </button>
    </Screen>
  );
}
