/**
 * Fixed demo clock. Every seed timestamp is relative to NOW so the prototype always reads the same
 * and server/client renders never disagree. Display uses Riyadh time (UTC+3, no DST).
 *
 * NOW = Wednesday 4 November 2026, 10:00 Riyadh.
 */

export const NOW_ISO = "2026-11-04T07:00:00.000Z";
export const NOW = Date.parse(NOW_ISO);

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
/** Riyadh offset from UTC. */
export const TZ_OFFSET = 3 * HOUR;
export const TIME_ZONE = "Asia/Riyadh";

/**
 * A timestamp `dayOffset` days from NOW (negative = past). With `time` ("HH:MM", Riyadh local),
 * the time of day is set explicitly; otherwise it keeps NOW's time of day (10:00).
 *
 *   at(-2, "14:30")  // two days ago at 14:30
 *   at(5, "18:00")   // due in five days at 18:00
 */
export function at(dayOffset: number, time?: string): string {
  const base = NOW + dayOffset * DAY;
  if (!time) return new Date(base).toISOString();
  const [hh, mm] = time.split(":").map(Number);
  const localMidnight = Math.floor((base + TZ_OFFSET) / DAY) * DAY - TZ_OFFSET;
  return new Date(localMidnight + hh * HOUR + mm * MINUTE).toISOString();
}

export function hoursAgo(hours: number): string {
  return new Date(NOW - hours * HOUR).toISOString();
}

export function minutesAgo(minutes: number): string {
  return new Date(NOW - minutes * MINUTE).toISOString();
}

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * DAY).toISOString();
}
