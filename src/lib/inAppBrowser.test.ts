import { describe, expect, it } from 'vitest';
import { chromeIntentUrl, detectInAppBrowser } from './inAppBrowser';

const UA = {
  whatsappAndroid:
    'Mozilla/5.0 (Linux; Android 13; SM-A536B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.144 Mobile Safari/537.36 WhatsApp/2.23.25.84',
  instagramIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 307.0.0.34.111 (iPhone14,5; iOS 17_1; fr_FR; fr; scale=3.00; 1170x2532; 532277127)',
  messengerAndroid:
    'Mozilla/5.0 (Linux; Android 12; M2101K6G; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0.6045.163 Mobile Safari/537.36 [FB_IAB/Orca-Android;FBAV/439.0.0.29.119;]',
  facebookIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBDV/iPhone13,2;FBMD/iPhone;FBSN/iOS;FBSV/16.6;FBSS/3;FBID/phone;FBLC/fr_FR;FBOP/5]',
  androidWebView: 'Mozilla/5.0 (Linux; Android 11; Pixel 4a; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0.0.0 Mobile Safari/537.36',
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  safariIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
  chromeDesktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

describe('in-app browser detection', () => {
  it('flags the embedded browsers Google refuses', () => {
    expect(detectInAppBrowser(UA.whatsappAndroid)).toBe('whatsapp');
    expect(detectInAppBrowser(UA.instagramIos)).toBe('instagram');
    expect(detectInAppBrowser(UA.messengerAndroid)).toBe('facebook');
    expect(detectInAppBrowser(UA.facebookIos)).toBe('facebook');
    expect(detectInAppBrowser(UA.androidWebView)).toBe('other');
  });

  it('leaves real browsers alone', () => {
    expect(detectInAppBrowser(UA.chromeAndroid)).toBeNull();
    expect(detectInAppBrowser(UA.safariIos)).toBeNull();
    expect(detectInAppBrowser(UA.chromeDesktop)).toBeNull();
  });

  it('builds a Chrome intent that falls back to the page', () => {
    expect(chromeIntentUrl('https://zid.netlify.app/')).toBe(
      'intent://zid.netlify.app/#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=https%3A%2F%2Fzid.netlify.app%2F;end',
    );
  });
});
