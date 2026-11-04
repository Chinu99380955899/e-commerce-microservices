import { isStringArray, readJson, writeJson } from '../../lib/storage';

export const RECENT_KEY = 'auramart.recentlyViewed.v1';
export const RECENT_LIMIT = 8;

/** Adds a product to the front of the recently viewed list (most recent first, no duplicates). */
export function rememberViewed(productId: string): void {
  const current = readJson(RECENT_KEY, [] as string[], isStringArray);
  const next = [productId, ...current.filter((id) => id !== productId)].slice(0, RECENT_LIMIT);
  writeJson(RECENT_KEY, next);
}

export function readRecentlyViewed(exclude?: string): string[] {
  return readJson(RECENT_KEY, [] as string[], isStringArray).filter((id) => id !== exclude);
}
