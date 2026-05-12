import { DateTime } from 'luxon';

const TZ = 'Asia/Jerusalem';

export function isCurrentMonthEntry(clockInAt: Date): boolean {
  const entry = DateTime.fromJSDate(clockInAt, { zone: TZ });
  const now = DateTime.now().setZone(TZ);
  return entry.month === now.month && entry.year === now.year;
}
