import type { ReactNode } from 'react';

/** Circular progress. Values over 100% draw a second lap in a darker stroke. */
export function ProgressRing({ value, max, size = 120, stroke = 12, color, children }: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  color: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? value / max : 0;
  const first = Math.min(pct, 1);
  const over = Math.min(Math.max(pct - 1, 0), 1);
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - first)}
          style={{ transition: 'stroke-dashoffset .6s ease' }}
        />
        {over > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--danger)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - over)}
          />
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function MacroBar({ label, value, goal, color, unit }: { label: string; value: number; goal: number; color: string; unit: string }) {
  const pct = goal > 0 ? Math.min(value / goal, 1) * 100 : 0;
  const over = value > goal;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-semibold">{label}</span>
        <span className={over ? 'font-semibold text-danger' : 'text-muted'}>
          <span className="num">{Math.round(value)}</span> / <span className="num">{goal}</span> {unit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: over ? 'var(--danger)' : color }} />
      </div>
    </div>
  );
}
