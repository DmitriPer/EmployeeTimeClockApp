import { DateTime } from 'luxon';

const DEFAULT_TZ = 'Asia/Jerusalem';

/**
 * Single source of truth for "is this entry in the locked period?".
 * Uses ISO datetime strings so both client and server can call without conversion.
 *
 * @param isoDateTime ISO datetime string (e.g. "2026-05-01T08:00:00Z")
 * @param timezone    IANA TZ identifier. Defaults to Asia/Jerusalem.
 */
export function isCurrentMonth(isoDateTime: string, timezone = DEFAULT_TZ): boolean {
  const entry = DateTime.fromISO(isoDateTime, { zone: timezone });
  const now = DateTime.now().setZone(timezone);
  return entry.isValid && entry.month === now.month && entry.year === now.year;
}

/** Convenience for date-only inputs (e.g. "2026-05-13"). */
export function isCurrentMonthDate(isoDate: string, timezone = DEFAULT_TZ): boolean {
  return isCurrentMonth(`${isoDate}T00:00:00`, timezone);
}
