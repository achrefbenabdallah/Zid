import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Sparkles, Square } from 'lucide-react';

/** Minimal typing for the Web Speech API (not in TS's DOM lib everywhere). */
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
}
type RecognitionCtor = new () => Recognition;
const Speech = (window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }).SpeechRecognition ??
  (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition;

const VOICE_LANGS = [
  { code: 'fr-FR', label: 'Français' },
  { code: 'ar-TN', label: 'العربية' },
  { code: 'en-US', label: 'English' },
] as const;
const VOICE_KEY = 'zid.voiceLang';
const readVoiceLang = (fallback: string) => {
  try {
    return localStorage.getItem(VOICE_KEY) ?? fallback;
  } catch {
    return fallback;
  }
};

export const MAX_DESCRIPTION = 600;

/** "2 œufs, une tabouna, harissa" — typed or dictated — sent to the AI as one description. */
export function DescribeMeal({ initial = '', onSubmit }: { initial?: string; onSubmit: (text: string) => void }) {
  const { t, i18n } = useTranslation();
  const [text, setText] = useState(initial);
  const [voiceLang, setVoiceLang] = useState(() => readVoiceLang(i18n.language === 'ar' ? 'ar-TN' : 'fr-FR'));
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);

  useEffect(() => () => rec.current?.stop(), []);

  const pickLang = (code: string) => {
    setVoiceLang(code);
    try {
      localStorage.setItem(VOICE_KEY, code);
    } catch {
      /* storage blocked */
    }
  };

  const toggleVoice = () => {
    if (!Speech) return;
    if (listening) return rec.current?.stop();
    setVoiceError(null);
    const r = new Speech();
    r.lang = voiceLang;
    r.interimResults = true;
    r.continuous = false;
    // Dictation is appended to what's already typed.
    const before = text.trim() ? `${text.trim()}, ` : '';
    r.onresult = (e) => {
      let said = '';
      for (let i = 0; i < e.results.length; i++) said += e.results[i][0].transcript;
      setText((before + said).slice(0, MAX_DESCRIPTION));
    };
    r.onerror = (e) => setVoiceError(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? t('describe.micBlocked') : t('describe.micFailed'));
    r.onend = () => setListening(false);
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setVoiceError(t('describe.micFailed'));
    }
  };

  const submit = () => {
    rec.current?.stop();
    if (text.trim()) onSubmit(text.trim());
  };

  return (
    <div className="space-y-3">
      <label className="label" htmlFor="describe-text">{t('describe.label')}</label>
      <div className="relative">
        <textarea
          id="describe-text"
          className="input min-h-32 resize-none pe-14"
          dir="auto"
          autoFocus
          maxLength={MAX_DESCRIPTION}
          placeholder={t('describe.placeholder')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && submit()}
        />
        {Speech && (
          <button
            type="button"
            onClick={toggleVoice}
            aria-pressed={listening}
            aria-label={listening ? t('describe.stop') : t('describe.speak')}
            title={listening ? t('describe.stop') : t('describe.speak')}
            className={`absolute end-2 bottom-2 grid h-11 w-11 place-items-center rounded-full ${listening ? 'animate-pulse bg-danger text-white' : 'bg-surface-2 text-ink'}`}
          >
            {listening ? <Square size={16} /> : <Mic size={20} />}
          </button>
        )}
      </div>

      {Speech ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted">{t('describe.voiceLang')}</span>
          {VOICE_LANGS.map((l) => (
            <button key={l.code} aria-pressed={voiceLang === l.code} className={voiceLang === l.code ? 'chip-active px-2.5 py-1 text-xs' : 'chip px-2.5 py-1 text-xs'} onClick={() => pickLang(l.code)}>
              {l.label}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted">{t('describe.noVoice')}</p>
      )}
      {listening && <p className="text-xs font-semibold text-danger">{t('describe.listening')}</p>}
      {voiceError && <p className="text-xs text-danger">{voiceError}</p>}

      <p className="text-xs text-muted">{t('describe.hint')}</p>
      <button className="btn-primary w-full py-3 text-base" disabled={!text.trim()} onClick={submit}>
        <Sparkles size={18} /> {t('describe.analyze')}
      </button>
    </div>
  );
}
