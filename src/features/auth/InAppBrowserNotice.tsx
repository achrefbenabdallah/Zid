import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, ExternalLink, TriangleAlert } from 'lucide-react';
import { chromeIntentUrl, detectInAppBrowser, isAndroid } from '@/lib/inAppBrowser';

/**
 * Shown on the login screen when Zid is opened inside WhatsApp / Instagram / Messenger…
 * where Google refuses to sign in. Email + password still works there.
 */
export function InAppBrowserNotice() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const app = detectInAppBrowser();
  if (!app) return null;

  const url = window.location.origin + '/';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt(t('auth.inApp.copyManual'), url);
    }
  };

  return (
    <div className="mb-4 rounded-2xl border border-carbs/40 bg-carbs/10 p-3 text-sm" role="alert">
      <p className="flex gap-2 font-semibold">
        <TriangleAlert size={18} className="mt-0.5 shrink-0 text-carbs" />
        {t('auth.inApp.title')}
      </p>
      <p className="mt-1 text-muted">{isAndroid() ? t('auth.inApp.bodyAndroid') : t('auth.inApp.bodyIos')}</p>
      <div className="mt-2 flex gap-2">
        {isAndroid() && (
          <a className="btn-primary flex-1 py-2" href={chromeIntentUrl(url)}>
            <ExternalLink size={16} /> {t('auth.inApp.openChrome')}
          </a>
        )}
        <button className="btn-ghost flex-1 py-2" onClick={() => void copy()}>
          <Copy size={16} /> {copied ? t('auth.inApp.copied') : t('auth.inApp.copy')}
        </button>
      </div>
    </div>
  );
}
