import { DateTime } from 'luxon';

const BREAK_ALLOWANCE_MINUTES = 60;
const OVERTIME_THRESHOLD_MINUTES = 540; // 9 hours

export function calcGrossTime(clockInUtc: string, clockOutUtc: string): number {
  const clockIn = DateTime.fromISO(clockInUtc, { zone: 'utc' });
  const clockOut = DateTime.fromISO(clockOutUtc, { zone: 'utc' });
  return Math.round(clockOut.diff(clockIn, 'minutes').minutes);
}

export function calcPaidHours(grossMinutes: number, totalBreakMinutes: number): number {
  const excessBreak = Math.max(0, totalBreakMinutes - BREAK_ALLOWANCE_MINUTES);
  return grossMinutes - excessBreak;
}

export function isOvertime(grossMinutes: number): boolean {
  return grossMinutes > OVERTIME_THRESHOLD_MINUTES;
}
