const formats = new Map<string, Intl.RelativeTimeFormat>();

function formatter(lang: string): Intl.RelativeTimeFormat {
  let f = formats.get(lang);
  if (!f) {
    f = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
    formats.set(lang, f);
  }
  return f;
}

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * "3 days ago", "yesterday", "2 weeks ago", in the given language. Anything
 * under a minute and a half is `justNow` (translated by the caller).
 * Returns "" for a missing or unparsable date.
 */
export function formatAgo(
  iso: string | null | undefined,
  lang: string,
  justNow: string,
  now: number = Date.now(),
): string {
  if (!iso) return "";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";

  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 90) return justNow;

  const rtf = formatter(lang);
  if (seconds < HOUR) return rtf.format(-Math.round(seconds / MINUTE), "minute");
  if (seconds < DAY) return rtf.format(-Math.round(seconds / HOUR), "hour");
  if (seconds < 7 * DAY) return rtf.format(-Math.floor(seconds / DAY), "day");
  if (seconds < 30 * DAY) return rtf.format(-Math.floor(seconds / (7 * DAY)), "week");
  if (seconds < 365 * DAY) return rtf.format(-Math.floor(seconds / (30 * DAY)), "month");
  return rtf.format(-Math.floor(seconds / (365 * DAY)), "year");
}
