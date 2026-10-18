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
  // One flag per call: several calls in a test each apply once (a later one overwrites a key of an earlier one).
  const id = Math.random().toString(36).slice(2);
  await page.addInitScript(
    ({ data, flag }) => {
      // Seed once per call: reloads must keep what the app wrote since then.
      if (sessionStorage.getItem(flag)) return;
      sessionStorage.setItem(flag, '1');
      for (const [key, value] of Object.entries(data)) {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      }
    },
    { data: entries, flag: `__seeded__${id}` },
  );
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
