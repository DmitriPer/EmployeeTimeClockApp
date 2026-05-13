import type { ClockStatus } from '../../enums/ClockStatus.js';

export interface ClockStatusDto {
  status: ClockStatus;
  entryId?: number;
  clockInAt?: string;
  breakStartAt?: string | null;
  totalBreakMinutes: number;
  grossMinutes?: number;
}

export interface ClockOutSummaryDto {
  entryId: number;
  clockInAt: string;
  clockOutAt: string;
  grossMinutes: number;
  totalBreakMinutes: number;
  excessBreakMinutes: number;
  paidMinutes: number;
  isAutoClosedBreak: boolean;
  isFlagged: boolean;
  overtimeMinutes: number;
}
