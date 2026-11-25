import { ThreadStashEntry } from '../types';
import { DMC_PALETTE } from '../data/dmcPalette';

export const STASH_STORAGE_KEY = 'sovereign_my_thread_stash';

// Standard Starter Stash (common embroidery staples)
export const STARTER_STASH_CODES = [
  'B5200',
  'Blanc',
  'Ecru',
  '310',
  '677',
  '816',
  '754',
  '3346',
  '939',
  '3865',
];

/**
 * Loads user thread stash from localStorage.
 * Returns a dictionary mapping DMC code (e.g. "310", "Blanc") to ThreadStashEntry.
 */
export function loadThreadStash(): Record<string, ThreadStashEntry> {
  try {
    const raw = localStorage.getItem(STASH_STORAGE_KEY);
    if (!raw) {
      // Seed with standard starter staple stash on initial visit
      const starterStash: Record<string, ThreadStashEntry> = {};
      const today = new Date().toISOString().split('T')[0];
      STARTER_STASH_CODES.forEach((code) => {
        starterStash[code] = {
          dmcCode: code,
          skeins: 1,
          dateAdded: today,
          notes: 'Heirloom staple',
        };
      });
      localStorage.setItem(STASH_STORAGE_KEY, JSON.stringify(starterStash));
      return starterStash;
    }
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
    return {};
  } catch (err) {
    console.error('Failed to load thread stash:', err);
    return {};
  }
}

/**
 * Saves thread stash dictionary to localStorage.
 */
export function saveThreadStash(stash: Record<string, ThreadStashEntry>): void {
  try {
    localStorage.setItem(STASH_STORAGE_KEY, JSON.stringify(stash));
  } catch (err) {
    console.error('Failed to save thread stash:', err);
  }
}

/**
 * Parse bulk string input (comma, space, or newline separated) and return matched DMC codes.
 */
export function parseBulkCodes(input: string): { validCodes: string[]; invalidTokens: string[] } {
  const paletteCodes = new Map<string, string>();
  DMC_PALETTE.forEach((c) => {
    paletteCodes.set(c.code.toUpperCase(), c.code);
  });

  // Split on commas, newlines, semicolons, tabs, and spaces
  const tokens = input
    .split(/[\s,;\n\r]+/)
    .map((t) => t.trim().replace(/^dmc\s*#?/i, '').replace(/^#/, ''))
    .filter((t) => t.length > 0);

  const validCodes: string[] = [];
  const invalidTokens: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    const upper = token.toUpperCase();
    if (paletteCodes.has(upper)) {
      const canonicalCode = paletteCodes.get(upper)!;
      if (!seen.has(canonicalCode)) {
        seen.add(canonicalCode);
        validCodes.push(canonicalCode);
      }
    } else {
      invalidTokens.push(token);
    }
  }

  return { validCodes, invalidTokens };
}
