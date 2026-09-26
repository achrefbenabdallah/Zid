#!/usr/bin/env node
/**
 * Builds src/data/exercises.json and public/exercises/<id>/{0,1}.webp from free-exercise-db.
 *
 *   npm run build:exercises            # downloads the dataset + images
 *   npm run build:exercises -- --json-only
 *
 * Source: https://github.com/yuhonas/free-exercise-db — The Unlicense (public domain).
 * Images are resized to 480px WebP so the whole library stays small and cacheable offline.
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CURATION } from './exercise-curation.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATASET = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const IMAGES = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const jsonOnly = process.argv.includes('--json-only');

const dataset = await (await fetch(DATASET)).json();
const byId = new Map(dataset.map((e) => [e.id, e]));

const missing = CURATION.filter(([id]) => !byId.has(id)).map(([id]) => id);
if (missing.length) {
  console.error('Unknown dataset ids:', missing);
  process.exit(1);
}
const dupes = CURATION.map(([id, g]) => `${id}|${g}`).filter((k, i, a) => a.indexOf(k) !== i);
if (dupes.length) {
  console.error('Duplicate entries:', dupes);
  process.exit(1);
}

const out = [];
for (const [id, group, nameAr, howTo, howToAr] of CURATION) {
  const src = byId.get(id);
  const images = [];
  for (const [i, rel] of src.images.slice(0, 2).entries()) {
    const file = `${id}/${i}.webp`;
    const dest = join(ROOT, 'public', 'exercises', file);
    images.push(file);
    if (jsonOnly) continue;
    try {
      await access(dest);
      continue; // already built
    } catch {
      /* build it */
    }
    const res = await fetch(IMAGES + rel);
    if (!res.ok) throw new Error(`Image ${rel}: HTTP ${res.status}`);
    await mkdir(dirname(dest), { recursive: true });
    await sharp(Buffer.from(await res.arrayBuffer())).resize({ width: 480, withoutEnlargement: true }).webp({ quality: 72 }).toFile(dest);
  }
  out.push({
    id,
    group,
    name: src.name,
    nameAr,
    howTo,
    howToAr,
    equipment: src.equipment ?? 'body only',
    images,
  });
  process.stdout.write('.');
}

await writeFile(join(ROOT, 'src', 'data', 'exercises.json'), JSON.stringify(out, null, 1) + '\n');
const counts = out.reduce((m, e) => ((m[e.group] = (m[e.group] ?? 0) + 1), m), {});
console.log(`\n${out.length} exercises`, counts);
