import { useEffect, useState } from 'react';

/**
 * Numeric input that keeps the user's raw text while typing ("1.", "", ",5")
 * and reports a parsed number. Accepts comma decimals (common on FR/AR keyboards).
 */
export function NumberField({ value, onChange, label, suffix, className = '', min = 0, step, id }: {
  value: number;
  onChange: (n: number) => void;
  label?: string;
  suffix?: string;
  className?: string;
  min?: number;
  step?: number;
  id?: string;
}) {
  const [text, setText] = useState(fmt(value));
  useEffect(() => {
    // Sync external changes without clobbering in-progress typing of the same number.
    if (parse(text) !== value) setText(fmt(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={className}>
      {label && <label className="label" htmlFor={id}>{label}</label>}
      <div className="relative">
        <input
          id={id}
          className={`input num w-full text-start ${suffix ? 'pe-9' : ''}`}
          inputMode="decimal"
          dir="ltr"
          value={text}
          step={step}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const raw = e.target.value.replace(',', '.');
            if (!/^\d*\.?\d*$/.test(raw)) return;
            setText(raw);
            const n = parse(raw);
            onChange(Math.max(min, n));
          }}
        />
        {suffix && <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted">{suffix}</span>}
      </div>
    </div>
  );
}

const parse = (s: string) => (s === '' || s === '.' ? 0 : Number(s));
const fmt = (n: number) => (n ? String(Math.round(n * 10) / 10) : '0');
