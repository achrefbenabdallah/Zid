import { describe, expect, it } from 'vitest';
import { en } from './en';
import { ar } from './ar';

type Tree = { [k: string]: string | Tree };

function flatten(t: Tree, prefix = ''): Record<string, string> {
  return Object.entries(t).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'string' ? { ...acc, [key]: v } : { ...acc, ...flatten(v, key) };
  }, {});
}

const EN = flatten(en as unknown as Tree);
const AR = flatten(ar as unknown as Tree);
const vars = (s: string) => [...s.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort();

describe('translations', () => {
  it('Arabic has every English key, non-empty', () => {
    const missing = Object.keys(EN).filter((k) => !(k in AR));
    expect(missing).toEqual([]);
    // Empty is only allowed for the Arabic _zero plural form of "new PRs" (never shown).
    const empty = Object.entries(AR).filter(([k, v]) => !v.trim() && !k.endsWith('_zero'));
    expect(empty).toEqual([]);
  });

  it('Arabic plurals provide all six CLDR forms', () => {
    const bases = Object.keys(EN)
      .filter((k) => k.endsWith('_one'))
      .map((k) => k.slice(0, -4));
    for (const base of bases) {
      for (const form of ['zero', 'one', 'two', 'few', 'many', 'other']) {
        expect(AR, `${base}_${form}`).toHaveProperty([`${base}_${form}`]);
      }
    }
  });

  it('keeps the same {{variables}} as English', () => {
    const mismatched = Object.keys(EN)
      .filter((k) => k in AR && !/_(zero|one|two)$/.test(k)) // Arabic singular/dual forms spell the number out
      .filter((k) => vars(EN[k]).join() !== vars(AR[k]).join());
    expect(mismatched).toEqual([]);
  });
});
