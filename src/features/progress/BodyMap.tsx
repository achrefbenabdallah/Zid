import type { SVGProps } from 'react';
import { useTranslation } from 'react-i18next';
import type { MuscleGroup } from '@/types';
import type { VolumeStatus } from '@/lib/training';

type Shape =
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; r: number }
  | { kind: 'path'; d: string };

/** Mirror a shape around the figure's centre line (x = 50). */
const pair = (s: Shape): Shape[] => {
  if (s.kind === 'ellipse') return [s, { ...s, cx: 100 - s.cx }];
  if (s.kind === 'rect') return [s, { ...s, x: 100 - s.x - s.w }];
  return [s];
};
const E = (cx: number, cy: number, rx: number, ry: number): Shape => ({ kind: 'ellipse', cx, cy, rx, ry });
const R = (x: number, y: number, w: number, h: number, r = 3): Shape => ({ kind: 'rect', x, y, w, h, r });

/** Body outline pieces that aren't scored (head, hands, pelvis, shins). */
const BASE: Shape[] = [
  E(50, 13, 9, 10.5),
  R(45, 22, 10, 7, 2),
  R(36, 28, 28, 56, 10),
  ...pair(E(18, 96, 4, 5)),
  R(38, 82, 24, 16, 6),
  ...pair(R(37, 136, 10, 34, 5)),
  ...pair(E(42, 173, 6, 3.5)),
];

const FRONT: [MuscleGroup, Shape[]][] = [
  ['traps', [{ kind: 'path', d: 'M42 27 L58 27 L64 32 L36 32 Z' }]],
  ['shoulders', pair(E(30, 37, 8, 7))],
  ['chest', pair(E(43, 44, 7.5, 6.5))],
  ['biceps', pair(E(24, 56, 5, 10))],
  ['forearms', pair(E(20, 78, 4.5, 11))],
  ['abs', [R(43, 53, 14, 28, 4)]],
  ['quadriceps', pair(E(42, 116, 7, 20))],
  ['adductors', pair(E(47.5, 106, 2.5, 9))],
];

const BACK: [MuscleGroup, Shape[]][] = [
  ['traps', [{ kind: 'path', d: 'M50 23 L64 31 L50 50 L36 31 Z' }]],
  ['shoulders', pair(E(30, 37, 8, 7))],
  ['back', [{ kind: 'path', d: 'M37 40 L48 44 L48 74 L39 66 Z' }, { kind: 'path', d: 'M63 40 L52 44 L52 74 L61 66 Z' }]],
  ['triceps', pair(E(24, 56, 5, 10))],
  ['forearms', pair(E(20, 78, 4.5, 11))],
  ['glutes', pair(E(43.5, 91, 7.5, 8))],
  ['hamstrings', pair(E(42, 118, 7, 17))],
  ['calves', pair(E(42, 150, 5.5, 12))],
];

const FILL: Record<VolumeStatus, string> = {
  none: 'var(--surface-2)',
  low: 'var(--carbs)',
  good: 'var(--kcal)',
  high: 'var(--water)',
};

function Draw({ shape, ...props }: { shape: Shape } & SVGProps<SVGElement>) {
  const p = props as SVGProps<SVGEllipseElement & SVGRectElement & SVGPathElement>;
  if (shape.kind === 'ellipse') return <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...p} />;
  if (shape.kind === 'rect') return <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.r} {...p} />;
  return <path d={shape.d} {...p} />;
}

function Figure({ parts, status, selected, onSelect, label }: {
  parts: [MuscleGroup, Shape[]][];
  status: (g: MuscleGroup) => VolumeStatus;
  selected: MuscleGroup | null;
  onSelect: (g: MuscleGroup) => void;
  label: string;
}) {
  const { t } = useTranslation();
  return (
    <figure className="flex-1 text-center">
      <svg viewBox="0 0 100 180" className="mx-auto h-56 w-auto" role="group" aria-label={label}>
        {BASE.map((s, i) => (
          <Draw key={i} shape={s} fill="var(--line)" opacity={0.45} />
        ))}
        {parts.map(([g, shapes]) => (
          <g
            key={g}
            role="button"
            tabIndex={0}
            aria-label={t(`muscles.${g}`)}
            aria-pressed={selected === g}
            className="cursor-pointer outline-none"
            onClick={() => onSelect(g)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(g)}
          >
            <title>{t(`muscles.${g}`)}</title>
            {shapes.map((s, i) => (
              <Draw
                key={i}
                shape={s}
                fill={FILL[status(g)]}
                stroke={selected === g ? 'var(--ink)' : 'var(--surface)'}
                strokeWidth={selected === g ? 1.6 : 1}
              />
            ))}
          </g>
        ))}
      </svg>
      <figcaption className="text-xs text-muted">{label}</figcaption>
    </figure>
  );
}

/** Front + back silhouettes coloured by weekly set volume. Tap a muscle to select it. */
export function BodyMap({ status, selected, onSelect }: {
  status: (g: MuscleGroup) => VolumeStatus;
  selected: MuscleGroup | null;
  onSelect: (g: MuscleGroup) => void;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex gap-2" dir="ltr">
        <Figure parts={FRONT} status={status} selected={selected} onSelect={onSelect} label={t('volume.front')} />
        <Figure parts={BACK} status={status} selected={selected} onSelect={onSelect} label={t('volume.back')} />
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-3 text-[11px] text-muted">
        {(['none', 'low', 'good', 'high'] as VolumeStatus[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-line" style={{ background: FILL[s] }} />
            {t(`volume.status.${s}`)}
          </span>
        ))}
      </div>
    </div>
  );
}
