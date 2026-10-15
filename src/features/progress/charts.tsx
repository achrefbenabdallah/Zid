/**
 * Chart building blocks (Recharts). Conventions — one series per chart, named by its title
 * (so no legend box); bars ≤24px with 4px rounded tops; 2px lines; ≥8px dots with a 2px
 * surface ring; hairline solid grid; hover tooltip on every chart; a table view for each.
 * Charts render LTR in both languages so time reads left→right like the axis numbers.
 */
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Table2 } from 'lucide-react';

export interface DailyPoint {
  date: string;
  label: string;
  value: number;
  goal?: number;
}

const AXIS = { fill: 'var(--muted)', fontSize: 11 };
const nf = (n: number, digits = 0) => n.toLocaleString('en-US', { maximumFractionDigits: digits });

export function ChartCard({ title, hint, children, table }: {
  title: string;
  hint?: string;
  children: ReactNode;
  table: { head: string[]; rows: (string | number)[][] };
}) {
  const { t } = useTranslation();
  const [asTable, setAsTable] = useState(false);
  return (
    <section className="card">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {hint && <p className="text-xs text-muted">{hint}</p>}
        </div>
        <button
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:bg-surface-2"
          onClick={() => setAsTable(!asTable)}
          aria-pressed={asTable}
        >
          {asTable ? <BarChart3 size={14} /> : <Table2 size={14} />}
          {asTable ? t('progress.chart') : t('progress.table')}
        </button>
      </div>
      {asTable ? (
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface text-xs text-muted">
              <tr>
                {table.head.map((h) => (
                  <th key={h} className="py-1.5 text-start font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="num-cells">
              {table.rows.map((r, i) => (
                <tr key={i} className="border-t border-line">
                  {r.map((c, j) => (
                    <td key={j} className="py-1.5" style={{ fontVariantNumeric: 'tabular-nums' }}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div dir="ltr">{children}</div>
      )}
    </section>
  );
}

/** Only what the tooltip reads from Recharts' content props. */
type TipProps = { active?: boolean; payload?: readonly { payload?: unknown; color?: string; stroke?: string }[] };

function TooltipBox({ active, payload, unit, valueLabel, goalLabel, digits = 0 }: TipProps & {
  unit: string;
  valueLabel: string;
  goalLabel?: string;
  digits?: number;
}) {
  const { i18n } = useTranslation();
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as DailyPoint & { kg?: number };
  const value = p.kg ?? p.value;
  return (
    // The chart area is forced LTR; the tooltip follows the UI language.
    <div dir={i18n.dir()} className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-semibold">{p.label}</div>
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: payload[0].color ?? payload[0].stroke }} />
        <span className="text-muted">{valueLabel}</span>
        <span className="num ms-auto font-semibold">{nf(value, digits)} {unit}</span>
      </div>
      {goalLabel && p.goal !== undefined && (
        <div className="mt-0.5 flex items-center gap-2 text-muted">
          <span className="inline-block h-0.5 w-2 bg-muted" />
          {goalLabel}
          <span className="num ms-auto">{nf(p.goal)} {unit}</span>
        </div>
      )}
    </div>
  );
}

function GoalDash({ cx, cy }: { cx?: number; cy?: number }) {
  if (cx === undefined || cy === undefined) return null;
  return <line x1={cx - 13} x2={cx + 13} y1={cy} y2={cy} stroke="var(--ink)" strokeOpacity={0.55} strokeWidth={2} strokeLinecap="round" />;
}

/** Daily columns with an optional per-day goal drawn as a short dash over each column. */
export function DailyBars({ data, color, unit, valueLabel, showGoal, height = 190 }: {
  data: DailyPoint[];
  color: string;
  unit: string;
  valueLabel: string;
  showGoal?: boolean;
  height?: number;
}) {
  const { t } = useTranslation();
  const many = data.length > 10;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 0 }} barCategoryGap={many ? 2 : '30%'}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeWidth={1} />
        <XAxis
          dataKey="label"
          tick={AXIS}
          tickLine={false}
          axisLine={{ stroke: 'var(--chart-grid)' }}
          interval={many ? 'preserveStartEnd' : 0}
          minTickGap={many ? 16 : 2}
        />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => nf(v)} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: 'var(--surface-2)', opacity: 0.6 }}
          content={(p) => <TooltipBox active={p.active} payload={p.payload} unit={unit} valueLabel={valueLabel} goalLabel={showGoal ? t('progress.goal') : undefined} />}
        />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
        {showGoal && (
          // Goal as a dash per day: exact even when training days raise the target.
          <Line dataKey="goal" stroke="none" dot={<GoalDash />} activeDot={false} isAnimationActive={false} legendType="none" />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export interface WeightPoint {
  date: string;
  label: string;
  kg: number;
}

export function WeightLine({ data, color, unit, valueLabel, height = 200 }: {
  data: WeightPoint[];
  color: string;
  unit: string;
  valueLabel: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeWidth={1} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} interval="preserveStartEnd" minTickGap={20} />
        <YAxis
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          width={40}
          domain={[(min: number) => Math.max(0, Math.floor(min - 1)), (max: number) => Math.ceil(max + 1)]}
          tickFormatter={(v: number) => nf(v)}
        />
        <Tooltip
          cursor={{ stroke: 'var(--muted)', strokeWidth: 1 }}
          content={(p) => <TooltipBox active={p.active} payload={p.payload} unit={unit} valueLabel={valueLabel} digits={1} />}
        />
        <Line
          type="monotone"
          dataKey="kg"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          dot={{ r: 4, fill: color, stroke: 'var(--surface)', strokeWidth: 2 }}
          activeDot={{ r: 6, fill: color, stroke: 'var(--surface)', strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Stat tile: label, value, optional sub-line. */
export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="card p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}
