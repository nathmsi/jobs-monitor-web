/** An offer counts as "new" for this long after it was added. */
export const FRESH_HOURS = 48;

/** True when the offer was added less than 48 hours ago. A missing or unreadable date is never fresh. */
export function isFresh(addedAt: string | null | undefined, now: number = Date.now()): boolean {
  if (!addedAt) return false;
  const then = Date.parse(addedAt);
  if (Number.isNaN(then)) return false;
  return now - then < FRESH_HOURS * 3_600_000;
}
