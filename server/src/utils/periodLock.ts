import { DateTime } from 'luxon';

const TZ = 'Asia/Jerusalem';

export function isCurrentMonthEntry(clockInAt: Date): boolean {
  const entry = DateTime.fromJSDate(clockInAt, { zone: TZ });
  const now = DateTime.now().setZone(TZ);
  return entry.month === now.month && entry.year === now.year;
}

export function isCurrentMonth(dateStr: string): boolean {
  const date = DateTime.fromISO(dateStr, { zone: TZ });
  const now = DateTime.now().setZone(TZ);
  return date.month === now.month && date.year === now.year;
}
