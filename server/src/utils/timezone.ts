import { DateTime } from 'luxon';

const TZ = 'Asia/Jerusalem';

export function toJerusalem(utcIsoString: string): DateTime {
  return DateTime.fromISO(utcIsoString, { zone: 'utc' }).setZone(TZ);
}

export function dayStart(utcIsoString: string): DateTime {
  return toJerusalem(utcIsoString).startOf('day').toUTC();
}

export function dayEnd(utcIsoString: string): DateTime {
  return toJerusalem(utcIsoString).endOf('day').toUTC();
}
