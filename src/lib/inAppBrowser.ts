/**
 * Google blocks OAuth inside apps' built-in browsers ("Error 403: disallowed_useragent"),
 * which is exactly where links shared on WhatsApp / Instagram / Messenger / TikTok open.
 * Detect them so the login screen can explain what to do instead of failing.
 */
export type InAppBrowser = 'whatsapp' | 'instagram' | 'facebook' | 'tiktok' | 'snapchat' | 'other';

export function detectInAppBrowser(ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent): InAppBrowser | null {
  if (/WhatsApp/i.test(ua)) return 'whatsapp';
  if (/Instagram/i.test(ua)) return 'instagram';
  if (/FBAN|FBAV|FB_IAB|FBIOS|Messenger/i.test(ua)) return 'facebook';
  if (/musical_ly|TikTok|BytedanceWebview|trill/i.test(ua)) return 'tiktok';
  if (/Snapchat/i.test(ua)) return 'snapchat';
  if (/Line\/|MicroMessenger|Twitter/i.test(ua)) return 'other';
  // Generic Android WebView (not Chrome): "; wv)" marker.
  if (/Android/i.test(ua) && /; wv\)/.test(ua)) return 'other';
  return null;
}

export const isAndroid = (ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent) => /Android/i.test(ua);

/** Android: an intent URL that reopens the current page in Chrome (falls back to the page itself). */
export function chromeIntentUrl(href: string): string {
  const u = new URL(href);
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.replace(':', '')};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(href)};end`;
}
