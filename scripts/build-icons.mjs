#!/usr/bin/env node
/**
 * Renders PWA icons from public/icon.svg:
 *   pwa-192.png, pwa-512.png            (purpose "any")
 *   pwa-maskable-512.png                (purpose "maskable": logo inside the 80% safe zone)
 *   apple-touch-icon.png (180)          (iOS home screen; iOS ignores the manifest icons)
 * Run: npm run build:icons
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const svg = await readFile(join(pub, 'icon.svg'));
const BG = '#0f1512';

const render = (size) => sharp(svg, { density: 384 }).resize(size, size).png();

await render(192).toFile(join(pub, 'pwa-192.png'));
await render(512).toFile(join(pub, 'pwa-512.png'));

// Maskable: full-bleed background, logo scaled to 70% so launcher masks never clip it.
const inner = await sharp(svg, { density: 384 }).resize(358, 358).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: BG } })
  .composite([{ input: inner, gravity: 'center' }])
  .png()
  .toFile(join(pub, 'pwa-maskable-512.png'));

// Apple: square, no transparency (iOS rounds the corners itself).
const apple = await sharp(svg, { density: 384 }).resize(150, 150).png().toBuffer();
await sharp({ create: { width: 180, height: 180, channels: 4, background: BG } })
  .composite([{ input: apple, gravity: 'center' }])
  .png()
  .toFile(join(pub, 'apple-touch-icon.png'));

console.log('icons written to public/');
