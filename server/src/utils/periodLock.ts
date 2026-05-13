import { isCurrentMonth, isCurrentMonthDate } from '@app/shared';

/** Adapter: keeps the Date-based signature used by existing server callers. */
export function isCurrentMonthEntry(clockInAt: Date): boolean {
  return isCurrentMonth(clockInAt.toISOString());
}

export { isCurrentMonth, isCurrentMonthDate };
