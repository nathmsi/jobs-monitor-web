import type { Page } from '@playwright/test';

/** localStorage keys the app persists to (kept in one place for the specs). */
export const STORAGE_KEYS = {
  profile: 'cvProfile.local.v1',
  preferences: 'jobPreferences.v1',
  savedJobs: 'savedJobs.local.v1',
  viewMode: 'jobsViewMode',
  language: 'i18nextLng',
  theme: 'theme',
} as const;

/**
 * Pre-populate localStorage before the app boots. Values are JSON-encoded
 * unless they are already strings. Call before `page.goto`.
 */
export async function seedStorage(page: Page, entries: Record<string, unknown>): Promise<void> {
  await page.addInitScript((data) => {
    // Seed once per test: reloads must keep what the app wrote since then.
    if (sessionStorage.getItem('__seeded__')) return;
    sessionStorage.setItem('__seeded__', '1');
    for (const [key, value] of Object.entries(data)) {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
  }, entries);
}

export async function readStorage<T = unknown>(page: Page, key: string): Promise<T | null> {
  const raw = await page.evaluate((k) => localStorage.getItem(k), key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as unknown as T;
  }
}
