/**
 * Data export: a Zid JSON backup (importable, see lib/zidFormat.ts), or CSVs per dataset.
 * CSVs start with a UTF-8 BOM so Excel shows Arabic food names correctly.
 */
import { exportAll } from './data';
import { exportZidFile } from './dataImport';
import { exerciseDisplayName } from '@/lib/zidFormat';
import { toDateKey } from '@/lib/dates';

type Row = Record<string, string | number | undefined | null>;

export function toCsv(rows: Row[], columns: string[]): string {
  const esc = (v: Row[string]) => {
    if (v === undefined || v === null) return '';
    const s = String(v);
    return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [columns.join(','), ...rows.map((r) => columns.map((c) => esc(r[c])).join(','))].join('\r\n');
}

export function download(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type ExportKind = 'json' | 'meals' | 'workouts' | 'weights';

export async function exportData(uid: string, kind: ExportKind) {
  const all = await exportAll(uid);
  const stamp = toDateKey();

  switch (kind) {
    case 'json':
      // Same format the importer accepts (Settings → Import) — a restorable backup.
      return download(`zid_data_export-${stamp}.json`, JSON.stringify(await exportZidFile(uid), null, 2), 'application/json');

    case 'meals':
      return download(
        `zid-meals-${stamp}.csv`,
        toCsv(
          all.meals.map((m) => ({
            date: m.date,
            time: new Date(m.loggedAt).toTimeString().slice(0, 5),
            meal: m.mealType,
            food: m.foodName,
            grams: m.grams,
            kcal: m.kcal,
            protein_g: m.protein,
            carbs_g: m.carbs,
            fat_g: m.fat,
          })),
          ['date', 'time', 'meal', 'food', 'grams', 'kcal', 'protein_g', 'carbs_g', 'fat_g'],
        ),
        'text/csv;charset=utf-8',
      );

    case 'workouts':
      // One row per set — easy to pivot in a spreadsheet.
      return download(
        `zid-workouts-${stamp}.csv`,
        toCsv(
          all.workouts.flatMap((w) =>
            w.exercises.flatMap((e) =>
              e.sets.map((s, i) => ({
                date: w.date,
                exercise: exerciseDisplayName(e),
                set: i + 1,
                kg: s.kg,
                reps: s.reps,
                intensity: w.intensity,
                session_kcal: w.caloriesBurned,
                notes: e.notes,
              })),
            ),
          ),
          ['date', 'exercise', 'set', 'kg', 'reps', 'intensity', 'session_kcal', 'notes'],
        ),
        'text/csv;charset=utf-8',
      );

    case 'weights':
      return download(
        `zid-bodyweight-${stamp}.csv`,
        toCsv(
          all.weights.map((w) => ({ date: w.date, kg: w.kg, arm_cm: w.arm, chest_cm: w.chest, thigh_cm: w.thigh, waist_cm: w.waist, body_fat_pct: w.bodyFat })),
          ['date', 'kg', 'arm_cm', 'chest_cm', 'thigh_cm', 'waist_cm', 'body_fat_pct'],
        ),
        'text/csv;charset=utf-8',
      );
  }
}
