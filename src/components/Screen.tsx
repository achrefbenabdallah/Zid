import type { ReactNode } from 'react';
import { ArrowLeft, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';

/** Standard page wrapper: sticky title bar + padded content. */
export function Screen({ title, back, actions, children, menu = !back }: { title: ReactNode; back?: boolean; actions?: ReactNode; children: ReactNode; menu?: boolean }) {
  const nav = useNavigate();
  const { t } = useTranslation();
  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="sticky top-0 z-20 flex items-center gap-2 bg-bg/85 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 backdrop-blur">
        {back && (
          <button onClick={() => nav(-1)} className="-ms-2 rounded-full p-2 hover:bg-surface-2" aria-label={t('common.back')}>
            <ArrowLeft size={22} className="flip-rtl" />
          </button>
        )}
        <h1 className="min-w-0 flex-1 truncate text-2xl font-extrabold tracking-tight">{title}</h1>
        {actions}
        {menu && (
          <Link to="/more" className="-me-2 rounded-full p-2 text-muted hover:bg-surface-2" aria-label={t('nav.more')}>
            <Settings size={22} />
          </Link>
        )}
      </header>
      <div className="px-4 pb-6">{children}</div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">{children}</p>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-surface-2 border-t-brand" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}
